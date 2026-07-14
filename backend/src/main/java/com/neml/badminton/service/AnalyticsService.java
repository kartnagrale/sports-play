package com.neml.badminton.service;

import com.neml.badminton.dto.MatchDtos.*;
import com.neml.badminton.entity.*;
import com.neml.badminton.repository.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class AnalyticsService {

    private static final int POINTS_WIN = 3;
    private static final int PENALTY_PER_UNPLAYED = 2;

    private final MatchRepository matchRepository;
    private final TeamRepository teamRepository;
    private final PlayerRepository playerRepository;

    @Value("${app.auction.squad-size}")
    private int squadSize;

    public AnalyticsService(MatchRepository matchRepository, TeamRepository teamRepository,
                            PlayerRepository playerRepository) {
        this.matchRepository = matchRepository;
        this.teamRepository = teamRepository;
        this.playerRepository = playerRepository;
    }

    public List<StandingDto> standings(boolean applyPenalties) {
        List<Team> teams = teamRepository.findAll();
        List<Match> completed = matchRepository.findAllByStatusOrderByScheduledAtAsc(MatchStatus.COMPLETED);

        Map<UUID, int[]> stats = new HashMap<>(); // [played, won, lost, formatWins, formatLosses]
        for (Team t : teams) stats.put(t.getId(), new int[]{0, 0, 0, 0, 0});

        for (Match m : completed) {
            UUID a = m.getTeamA().getId(), b = m.getTeamB().getId();
            stats.get(a)[0]++; stats.get(b)[0]++;
            stats.get(a)[3] += m.getTeamAFormatWins();
            stats.get(a)[4] += m.getTeamBFormatWins();
            stats.get(b)[3] += m.getTeamBFormatWins();
            stats.get(b)[4] += m.getTeamAFormatWins();
            if (m.getWinnerTeam() != null) {
                if (m.getWinnerTeam().getId().equals(a)) { stats.get(a)[1]++; stats.get(b)[2]++; }
                else { stats.get(b)[1]++; stats.get(a)[2]++; }
            }
        }

        // participation per team
        Map<UUID, Set<UUID>> playedByTeam = playedPlayerIdsByTeam(completed);

        // Head-to-head: teamId -> opponentId -> wins
        Map<UUID, Map<UUID, Integer>> h2h = new HashMap<>();
        for (Team t : teams) h2h.put(t.getId(), new HashMap<>());
        for (Match m : completed) {
            if (m.getWinnerTeam() == null) continue;
            UUID w = m.getWinnerTeam().getId();
            UUID other = w.equals(m.getTeamA().getId()) ? m.getTeamB().getId() : m.getTeamA().getId();
            h2h.get(w).merge(other, 1, Integer::sum);
        }

        List<StandingDto> pre = new ArrayList<>();
        for (Team t : teams) {
            int[] s = stats.get(t.getId());
            int base = s[1] * POINTS_WIN;
            List<UUID> unplayed = unplayedPlayerIds(t, playedByTeam.getOrDefault(t.getId(), Set.of()));
            int penalty = applyPenalties ? unplayed.size() * PENALTY_PER_UNPLAYED : 0;
            int total = base - penalty;
            pre.add(new StandingDto(
                    TeamRef.from(t),
                    s[0], s[1], s[2],
                    s[3], s[4], s[3] - s[4],
                    base, penalty, total,
                    0, unplayed
            ));
        }
        // Sort by tie-breakers: totalPoints → head-to-head wins → formatWins → formatDiff → team name
        pre.sort((x, y) -> {
            int c = Integer.compare(y.totalPoints(), x.totalPoints());
            if (c != 0) return c;
            int xh = h2h.getOrDefault(x.team().id(), Map.of()).getOrDefault(y.team().id(), 0);
            int yh = h2h.getOrDefault(y.team().id(), Map.of()).getOrDefault(x.team().id(), 0);
            c = Integer.compare(yh, xh);
            if (c != 0) return c;
            c = Integer.compare(y.formatWins(), x.formatWins());
            if (c != 0) return c;
            c = Integer.compare(y.formatDiff(), x.formatDiff());
            if (c != 0) return c;
            return x.team().name().compareTo(y.team().name());
        });
        List<StandingDto> ranked = new ArrayList<>();
        int rank = 1;
        for (StandingDto s : pre) {
            ranked.add(new StandingDto(s.team(), s.played(), s.won(), s.lost(),
                    s.formatWins(), s.formatLosses(), s.formatDiff(),
                    s.basePoints(), s.penalty(), s.totalPoints(), rank++, s.unplayedPlayerIds()));
        }
        return ranked;
    }

    private Map<UUID, Set<UUID>> playedPlayerIdsByTeam(List<Match> matches) {
        Map<UUID, Set<UUID>> map = new HashMap<>();
        for (Match m : matches) {
            for (MatchFormat f : m.getFormats()) {
                for (Player p : f.getSideAPlayers()) {
                    map.computeIfAbsent(m.getTeamA().getId(), k -> new HashSet<>()).add(p.getId());
                }
                for (Player p : f.getSideBPlayers()) {
                    map.computeIfAbsent(m.getTeamB().getId(), k -> new HashSet<>()).add(p.getId());
                }
            }
        }
        return map;
    }

    private List<UUID> unplayedPlayerIds(Team team, Set<UUID> played) {
        return playerRepository.findAll().stream()
                .filter(p -> p.getTeam() != null && p.getTeam().getId().equals(team.getId()))
                .filter(p -> !played.contains(p.getId()))
                .map(Player::getId)
                .toList();
    }

    public List<FormatLeaderDto> formatLeaders() {
        List<Team> teams = teamRepository.findAll();
        List<Match> matches = matchRepository.findAll();
        List<FormatLeaderDto> out = new ArrayList<>();
        for (FormatType ft : FormatType.values()) {
            Map<UUID, Integer> winsByTeam = new HashMap<>();
            for (Team t : teams) winsByTeam.put(t.getId(), 0);
            for (Match m : matches) {
                for (MatchFormat f : m.getFormats()) {
                    if (f.getFormatType() == ft && Boolean.TRUE.equals(f.getCompleted()) && f.getWinnerTeam() != null) {
                        winsByTeam.merge(f.getWinnerTeam().getId(), 1, Integer::sum);
                    }
                }
            }
            List<FormatLeaderDto.TeamStat> all = teams.stream()
                    .map(t -> new FormatLeaderDto.TeamStat(TeamRef.from(t), winsByTeam.getOrDefault(t.getId(), 0)))
                    .sorted((a, b) -> Integer.compare(b.wins(), a.wins()))
                    .toList();
            FormatLeaderDto.TeamStat top = all.get(0);
            out.add(new FormatLeaderDto(ft, top.wins() > 0 ? top.team() : null, top.wins(), all));
        }
        return out;
    }

    public TeamAnalysisDto teamAnalysis(UUID teamId) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Team not found"));
        List<Match> completed = matchRepository.findAllByStatusOrderByScheduledAtAsc(MatchStatus.COMPLETED);

        int played = 0, won = 0, lost = 0;
        Map<FormatType, int[]> fmt = new EnumMap<>(FormatType.class);
        for (FormatType ft : FormatType.values()) fmt.put(ft, new int[]{0, 0});
        Map<UUID, int[]> h2h = new HashMap<>(); // opponentId -> [played, won, lost]

        Set<UUID> played_players = new HashSet<>();

        for (Match m : completed) {
            boolean isA = m.getTeamA().getId().equals(teamId);
            boolean isB = m.getTeamB().getId().equals(teamId);
            if (!isA && !isB) continue;
            played++;
            Team opp = isA ? m.getTeamB() : m.getTeamA();
            h2h.computeIfAbsent(opp.getId(), k -> new int[]{0, 0, 0});
            h2h.get(opp.getId())[0]++;
            if (m.getWinnerTeam() != null && m.getWinnerTeam().getId().equals(teamId)) {
                won++; h2h.get(opp.getId())[1]++;
            } else if (m.getWinnerTeam() != null) {
                lost++; h2h.get(opp.getId())[2]++;
            }
            for (MatchFormat f : m.getFormats()) {
                if (!Boolean.TRUE.equals(f.getCompleted())) continue;
                int[] arr = fmt.get(f.getFormatType());
                boolean weWon = f.getWinnerTeam() != null && f.getWinnerTeam().getId().equals(teamId);
                if (weWon) arr[0]++; else arr[1]++;
                List<Player> ours = isA ? f.getSideAPlayers() : f.getSideBPlayers();
                for (Player p : ours) played_players.add(p.getId());
            }
        }

        // strongest / weakest based on win differential
        FormatType strongest = null, weakest = null;
        int bestDiff = Integer.MIN_VALUE, worstDiff = Integer.MAX_VALUE;
        for (FormatType ft : FormatType.values()) {
            int[] arr = fmt.get(ft);
            int diff = arr[0] - arr[1];
            if (arr[0] + arr[1] == 0) continue;
            if (diff > bestDiff) { bestDiff = diff; strongest = ft; }
            if (diff < worstDiff) { worstDiff = diff; weakest = ft; }
        }

        long squad = playerRepository.findAll().stream()
                .filter(p -> p.getTeam() != null && p.getTeam().getId().equals(teamId)).count();
        double participationPct = squad == 0 ? 0.0 : (played_players.size() * 100.0 / squad);
        List<UUID> unplayed = playerRepository.findAll().stream()
                .filter(p -> p.getTeam() != null && p.getTeam().getId().equals(teamId))
                .map(Player::getId)
                .filter(id -> !played_players.contains(id))
                .toList();

        List<TeamAnalysisDto.FormatBreakdown> breakdown = new ArrayList<>();
        for (FormatType ft : FormatType.values()) {
            int[] arr = fmt.get(ft);
            breakdown.add(new TeamAnalysisDto.FormatBreakdown(ft, arr[0], arr[1]));
        }

        List<TeamAnalysisDto.HeadToHead> h2hList = new ArrayList<>();
        for (Map.Entry<UUID, int[]> e : h2h.entrySet()) {
            Team opp = teamRepository.findById(e.getKey()).orElse(null);
            if (opp == null) continue;
            int[] a = e.getValue();
            h2hList.add(new TeamAnalysisDto.HeadToHead(TeamRef.from(opp), a[0], a[1], a[2]));
        }
        double winPct = played == 0 ? 0.0 : (won * 100.0 / played);

        return new TeamAnalysisDto(
                TeamRef.from(team), played, won, lost, winPct,
                played_players.size(), (int) squad, participationPct, unplayed,
                strongest, weakest, breakdown, h2hList
        );
    }

    public List<TopPerformerDto> topPerformers(int limit) {
        List<Match> completed = matchRepository.findAllByStatusOrderByScheduledAtAsc(MatchStatus.COMPLETED);

        // playerId -> stats
        Map<UUID, int[]> stats = new HashMap<>(); // [played, won, lost, currentStreak, longestStreak, totalPtsWon, totalMargin, marginCount]
        Map<UUID, Player> playerMap = new HashMap<>();

        for (Match m : completed) {
            for (MatchFormat f : m.getFormats()) {
                if (!Boolean.TRUE.equals(f.getCompleted())) continue;
                UUID winnerTeam = f.getWinnerTeam() == null ? null : f.getWinnerTeam().getId();
                for (Player p : f.getSideAPlayers()) {
                    boolean won = winnerTeam != null && winnerTeam.equals(m.getTeamA().getId());
                    recordStat(stats, playerMap, p, won, f.getScoreA(), f.getScoreB());
                }
                for (Player p : f.getSideBPlayers()) {
                    boolean won = winnerTeam != null && winnerTeam.equals(m.getTeamB().getId());
                    recordStat(stats, playerMap, p, won, f.getScoreB(), f.getScoreA());
                }
            }
        }

        return stats.entrySet().stream()
                .map(e -> {
                    int[] s = e.getValue();
                    Player p = playerMap.get(e.getKey());
                    double winPct = s[0] == 0 ? 0.0 : (s[1] * 100.0 / s[0]);
                    int avgMargin = s[7] == 0 ? 0 : s[6] / s[7];
                    return new TopPerformerDto(
                            PlayerRef.from(p),
                            p.getTeam() == null ? null : TeamRef.from(p.getTeam()),
                            s[0], s[1], s[2], winPct,
                            s[4], s[5], avgMargin
                    );
                })
                .sorted((a, b) -> {
                    int c = Integer.compare(b.wins(), a.wins());
                    if (c != 0) return c;
                    return Double.compare(b.winPct(), a.winPct());
                })
                .limit(limit)
                .collect(Collectors.toList());
    }

    private void recordStat(Map<UUID, int[]> stats, Map<UUID, Player> pm, Player p, boolean won, int myScore, int oppScore) {
        pm.putIfAbsent(p.getId(), p);
        int[] s = stats.computeIfAbsent(p.getId(), k -> new int[8]);
        s[0]++;
        if (won) {
            s[1]++;
            s[3]++;
            if (s[3] > s[4]) s[4] = s[3];
            s[5] += myScore;
            s[6] += (myScore - oppScore);
            s[7]++;
        } else {
            s[2]++;
            s[3] = 0;
        }
    }
}
