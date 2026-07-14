package com.neml.badminton.service;

import com.neml.badminton.dto.MatchDtos.*;
import com.neml.badminton.entity.*;
import com.neml.badminton.repository.*;
import com.neml.badminton.websocket.AuctionBroadcaster;
import jakarta.transaction.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

@Service
public class MatchService {

    private static final FormatType[] FIVE_FORMATS = {
            FormatType.MENS_SINGLES,
            FormatType.WOMENS_SINGLES,
            FormatType.MENS_DOUBLES,
            FormatType.MIXED_DOUBLES,
            FormatType.MENS_DOUBLES_TWO,
    };

    private final MatchRepository matchRepository;
    private final MatchFormatRepository formatRepository;
    private final TeamRepository teamRepository;
    private final PlayerRepository playerRepository;
    private final AuctionBroadcaster broadcaster;

    public MatchService(MatchRepository matchRepository, MatchFormatRepository formatRepository,
                        TeamRepository teamRepository, PlayerRepository playerRepository,
                        AuctionBroadcaster broadcaster) {
        this.matchRepository = matchRepository;
        this.formatRepository = formatRepository;
        this.teamRepository = teamRepository;
        this.playerRepository = playerRepository;
        this.broadcaster = broadcaster;
    }

    public List<MatchDto> listAll() {
        return matchRepository.findAllByOrderByMatchNumberAsc().stream().map(MatchDto::from).toList();
    }

    public MatchDto get(UUID id) {
        return MatchDto.from(matchRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Match not found")));
    }

    @Transactional
    public MatchDto create(CreateMatchRequest req) {
        Team a = teamRepository.findById(req.teamAId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Team A not found"));
        Team b = teamRepository.findById(req.teamBId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Team B not found"));
        if (a.getId().equals(b.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Teams must be different");
        }
        int nextNumber = (int) matchRepository.count() + 1;
        Match m = Match.builder()
                .teamA(a).teamB(b)
                .scheduledAt(req.scheduledAt())
                .status(MatchStatus.SCHEDULED)
                .teamAFormatWins(0).teamBFormatWins(0)
                .matchNumber(nextNumber)
                .venue(req.venue())
                .build();
        matchRepository.save(m);
        // Auto-create 5 formats
        for (int i = 0; i < FIVE_FORMATS.length; i++) {
            MatchFormat f = MatchFormat.builder()
                    .match(m)
                    .formatType(FIVE_FORMATS[i])
                    .formatOrder(i + 1)
                    .scoreA(0).scoreB(0)
                    .completed(false)
                    .build();
            formatRepository.save(f);
            m.getFormats().add(f);
        }
        broadcast("MATCH_CREATED", m);
        return MatchDto.from(matchRepository.findById(m.getId()).orElseThrow());
    }

    @Transactional
    public MatchDto assignPlayers(UUID formatId, AssignPlayersRequest req) {
        MatchFormat f = formatRepository.findById(formatId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Format not found"));
        if (f.getCompleted()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Format already completed");
        }
        Match match = f.getMatch();
        // Validate: no player should already be assigned to another format in same match
        Set<UUID> existingA = new HashSet<>();
        Set<UUID> existingB = new HashSet<>();
        for (MatchFormat other : match.getFormats()) {
            if (other.getId().equals(f.getId())) continue;
            other.getSideAPlayers().forEach(p -> existingA.add(p.getId()));
            other.getSideBPlayers().forEach(p -> existingB.add(p.getId()));
        }
        for (UUID pid : req.sideAPlayerIds()) {
            if (existingA.contains(pid)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Player already playing another format in this match (Team A side)");
            }
        }
        for (UUID pid : req.sideBPlayerIds()) {
            if (existingB.contains(pid)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Player already playing another format in this match (Team B side)");
            }
        }
        // Load and set player entities; also verify team affiliation and gender rules
        List<Player> aPlayers = req.sideAPlayerIds().stream()
                .map(id -> playerRepository.findById(id)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Player not found")))
                .toList();
        List<Player> bPlayers = req.sideBPlayerIds().stream()
                .map(id -> playerRepository.findById(id)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Player not found")))
                .toList();
        for (Player p : aPlayers) {
            if (p.getTeam() == null || !p.getTeam().getId().equals(match.getTeamA().getId())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        p.getFullName() + " is not in Team A");
            }
        }
        for (Player p : bPlayers) {
            if (p.getTeam() == null || !p.getTeam().getId().equals(match.getTeamB().getId())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        p.getFullName() + " is not in Team B");
            }
        }
        validateFormatComposition(f.getFormatType(), aPlayers, bPlayers);

        f.getSideAPlayers().clear();
        f.getSideAPlayers().addAll(aPlayers);
        f.getSideBPlayers().clear();
        f.getSideBPlayers().addAll(bPlayers);
        formatRepository.save(f);

        // If match not yet LIVE, upgrade to LIVE on first assignment
        if (match.getStatus() == MatchStatus.SCHEDULED) {
            match.setStatus(MatchStatus.LIVE);
            matchRepository.save(match);
        }
        broadcast("FORMAT_ASSIGNED", match);
        return MatchDto.from(matchRepository.findById(match.getId()).orElseThrow());
    }

    private void validateFormatComposition(FormatType t, List<Player> a, List<Player> b) {
        int expected;
        switch (t) {
            case MENS_SINGLES, WOMENS_SINGLES -> expected = 1;
            default -> expected = 2;
        }
        if (a.size() != expected || b.size() != expected) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    t + " requires " + expected + " player(s) per side");
        }
        switch (t) {
            case MENS_SINGLES, MENS_DOUBLES, MENS_DOUBLES_TWO -> {
                if (a.stream().anyMatch(p -> p.getGender() != Gender.MALE) ||
                    b.stream().anyMatch(p -> p.getGender() != Gender.MALE))
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only male players for " + t);
            }
            case WOMENS_SINGLES -> {
                if (a.stream().anyMatch(p -> p.getGender() != Gender.FEMALE) ||
                    b.stream().anyMatch(p -> p.getGender() != Gender.FEMALE))
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only female players for " + t);
            }
            case MIXED_DOUBLES -> {
                if (!hasOneMaleOneFemale(a) || !hasOneMaleOneFemale(b))
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mixed doubles requires 1M + 1F per side");
            }
        }
    }

    private boolean hasOneMaleOneFemale(List<Player> ps) {
        return ps.size() == 2 &&
                ps.stream().filter(p -> p.getGender() == Gender.MALE).count() == 1 &&
                ps.stream().filter(p -> p.getGender() == Gender.FEMALE).count() == 1;
    }

    @Transactional
    public MatchDto reportFormatResult(UUID formatId, ReportFormatResultRequest req) {
        MatchFormat f = formatRepository.findById(formatId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Format not found"));
        if (f.getSideAPlayers().isEmpty() || f.getSideBPlayers().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Assign players before reporting a result");
        }
        if (req.scoreA().equals(req.scoreB())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Scores cannot be equal (no draws in badminton)");
        }
        Match match = f.getMatch();
        f.setScoreA(req.scoreA());
        f.setScoreB(req.scoreB());
        Team winner = req.scoreA() > req.scoreB() ? match.getTeamA() : match.getTeamB();
        f.setWinnerTeam(winner);
        f.setCompleted(true);
        formatRepository.save(f);

        // Recompute match tallies
        int aWins = 0, bWins = 0, completed = 0;
        for (MatchFormat mf : match.getFormats()) {
            if (Boolean.TRUE.equals(mf.getCompleted())) {
                completed++;
                if (mf.getWinnerTeam() != null && mf.getWinnerTeam().getId().equals(match.getTeamA().getId())) aWins++;
                else if (mf.getWinnerTeam() != null && mf.getWinnerTeam().getId().equals(match.getTeamB().getId())) bWins++;
            }
        }
        match.setTeamAFormatWins(aWins);
        match.setTeamBFormatWins(bWins);
        if (match.getStatus() == MatchStatus.SCHEDULED) match.setStatus(MatchStatus.LIVE);
        if (completed == match.getFormats().size()) {
            match.setStatus(MatchStatus.COMPLETED);
            match.setWinnerTeam(aWins > bWins ? match.getTeamA() : match.getTeamB());
        }
        matchRepository.save(match);
        broadcast("FORMAT_RESULT", match);
        return MatchDto.from(matchRepository.findById(match.getId()).orElseThrow());
    }

    @Transactional
    public void deleteMatch(UUID id) {
        matchRepository.deleteById(id);
        broadcaster.broadcastMatch("MATCH_DELETED", Map.of("id", id.toString()));
    }

    private void broadcast(String type, Match m) {
        broadcaster.broadcastMatch(type, Map.of(
                "matchId", m.getId().toString(),
                "matchNumber", m.getMatchNumber(),
                "status", m.getStatus().name(),
                "teamA", m.getTeamA().getName(),
                "teamB", m.getTeamB().getName()
        ));
    }
}
