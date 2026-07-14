package com.neml.badminton.service;

import com.neml.badminton.entity.*;
import com.neml.badminton.repository.*;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
public class DemoService {

    private final TeamRepository teamRepository;
    private final PlayerRepository playerRepository;
    private final MatchRepository matchRepository;
    private final MatchFormatRepository matchFormatRepository;
    private final BidRepository bidRepository;
    private final AuctionStateRepository auctionStateRepository;
    private final MatchService matchService;

    @Value("${app.auction.squad-size}") private int squadSize;

    public DemoService(TeamRepository teamRepository, PlayerRepository playerRepository,
                       MatchRepository matchRepository, MatchFormatRepository matchFormatRepository,
                       BidRepository bidRepository, AuctionStateRepository auctionStateRepository,
                       MatchService matchService) {
        this.teamRepository = teamRepository;
        this.playerRepository = playerRepository;
        this.matchRepository = matchRepository;
        this.matchFormatRepository = matchFormatRepository;
        this.bidRepository = bidRepository;
        this.auctionStateRepository = auctionStateRepository;
        this.matchService = matchService;
    }

    /**
     * Wipe matches + bids + player-team assignments and re-populate:
     *   - 4 teams × 12 players (3F + 9M each)
     *   - 6 round-robin fixtures (SCHEDULED)
     *   - Optionally auto-play a subset of matches with random results.
     */
    @Transactional
    public Map<String, Object> populate(int matchesToAutoPlay) {
        // Reset
        matchFormatRepository.deleteAll();
        matchRepository.deleteAll();
        bidRepository.deleteAll();
        for (Player p : playerRepository.findAll()) {
            p.setTeam(null);
            p.setStatus(PlayerStatus.AVAILABLE);
            p.setSoldPrice(null);
            playerRepository.save(p);
        }
        for (Team t : teamRepository.findAll()) {
            t.setPurseRemaining(t.getPurseTotal());
            t.setMaleCount(0);
            t.setFemaleCount(0);
            teamRepository.save(t);
        }
        for (AuctionState s : auctionStateRepository.findAll()) {
            s.setStatus(AuctionStatus.NOT_STARTED);
            s.setCurrentPlayer(null);
            auctionStateRepository.save(s);
        }

        // Distribute players
        List<Team> teams = teamRepository.findAll().stream()
                .sorted(Comparator.comparing(Team::getShortCode)).toList();
        List<Player> males = playerRepository.findAll().stream()
                .filter(p -> p.getGender() == Gender.MALE)
                .sorted(Comparator.comparing(Player::getAuctionOrder)).toList();
        List<Player> females = playerRepository.findAll().stream()
                .filter(p -> p.getGender() == Gender.FEMALE)
                .sorted(Comparator.comparing(Player::getAuctionOrder)).toList();

        Random rng = new Random(7);
        BigDecimal price = BigDecimal.valueOf(3_000_000L); // avg ₹30 L per player for demo
        int mIdx = 0, fIdx = 0;
        for (Team t : teams) {
            for (int i = 0; i < 9; i++) {
                Player p = males.get(mIdx++);
                p.setTeam(t); p.setStatus(PlayerStatus.SOLD);
                p.setSoldPrice(price.add(BigDecimal.valueOf(rng.nextInt(20) * 100000L)));
                playerRepository.save(p);
            }
            for (int i = 0; i < 3; i++) {
                Player p = females.get(fIdx++);
                p.setTeam(t); p.setStatus(PlayerStatus.SOLD);
                p.setSoldPrice(price.add(BigDecimal.valueOf(rng.nextInt(20) * 100000L)));
                playerRepository.save(p);
            }
            t.setMaleCount(9);
            t.setFemaleCount(3);
            // Deduct approximate spend
            t.setPurseRemaining(t.getPurseTotal().subtract(price.multiply(BigDecimal.valueOf(12))));
            teamRepository.save(t);
        }

        // Round-robin fixtures
        List<Match> created = new ArrayList<>();
        Instant now = Instant.now();
        int matchNum = 1;
        for (int i = 0; i < teams.size(); i++) {
            for (int j = i + 1; j < teams.size(); j++) {
                Team a = teams.get(i), b = teams.get(j);
                Match m = Match.builder()
                        .teamA(a).teamB(b)
                        .scheduledAt(now.plus(matchNum, ChronoUnit.DAYS))
                        .status(MatchStatus.SCHEDULED)
                        .teamAFormatWins(0).teamBFormatWins(0)
                        .matchNumber(matchNum++)
                        .venue("Court " + (rng.nextInt(3) + 1))
                        .build();
                matchRepository.save(m);
                FormatType[] all = FormatType.values();
                for (int k = 0; k < all.length; k++) {
                    MatchFormat f = MatchFormat.builder()
                            .match(m).formatType(all[k]).formatOrder(k + 1)
                            .scoreA(0).scoreB(0).completed(false).build();
                    matchFormatRepository.save(f);
                    m.getFormats().add(f);
                }
                created.add(m);
            }
        }

        // Auto-play some matches
        int autoPlayed = 0;
        for (Match m : created) {
            if (autoPlayed >= matchesToAutoPlay) break;
            autoPlayMatch(m, rng);
            autoPlayed++;
        }

        return Map.of(
                "teams", teams.size(),
                "matches", created.size(),
                "autoPlayed", autoPlayed
        );
    }

    private void autoPlayMatch(Match m, Random rng) {
        List<Player> aMales = playersOfTeam(m.getTeamA(), Gender.MALE);
        List<Player> bMales = playersOfTeam(m.getTeamB(), Gender.MALE);
        List<Player> aFemales = playersOfTeam(m.getTeamA(), Gender.FEMALE);
        List<Player> bFemales = playersOfTeam(m.getTeamB(), Gender.FEMALE);
        Collections.shuffle(aMales, rng);
        Collections.shuffle(bMales, rng);
        Collections.shuffle(aFemales, rng);
        Collections.shuffle(bFemales, rng);

        int aM = 0, bM = 0, aF = 0, bF = 0;

        for (MatchFormat f : m.getFormats()) {
            List<Player> sideA = new ArrayList<>();
            List<Player> sideB = new ArrayList<>();
            switch (f.getFormatType()) {
                case MENS_SINGLES -> { sideA.add(aMales.get(aM++)); sideB.add(bMales.get(bM++)); }
                case WOMENS_SINGLES -> { sideA.add(aFemales.get(aF++)); sideB.add(bFemales.get(bF++)); }
                case MENS_DOUBLES -> { sideA.add(aMales.get(aM++)); sideA.add(aMales.get(aM++));
                                        sideB.add(bMales.get(bM++)); sideB.add(bMales.get(bM++)); }
                case MENS_DOUBLES_TWO -> { sideA.add(aMales.get(aM++)); sideA.add(aMales.get(aM++));
                                            sideB.add(bMales.get(bM++)); sideB.add(bMales.get(bM++)); }
                case MIXED_DOUBLES -> { sideA.add(aMales.get(aM++)); sideA.add(aFemales.get(aF++));
                                         sideB.add(bMales.get(bM++)); sideB.add(bFemales.get(bF++)); }
            }
            f.getSideAPlayers().addAll(sideA);
            f.getSideBPlayers().addAll(sideB);
            int scoreA = 15 + rng.nextInt(10);
            int scoreB = 15 + rng.nextInt(10);
            if (scoreA == scoreB) scoreB++;
            f.setScoreA(scoreA); f.setScoreB(scoreB);
            f.setCompleted(true);
            f.setWinnerTeam(scoreA > scoreB ? m.getTeamA() : m.getTeamB());
            matchFormatRepository.save(f);
        }
        int aWins = (int) m.getFormats().stream().filter(f -> f.getWinnerTeam() != null &&
                f.getWinnerTeam().getId().equals(m.getTeamA().getId())).count();
        int bWins = m.getFormats().size() - aWins;
        m.setTeamAFormatWins(aWins);
        m.setTeamBFormatWins(bWins);
        m.setStatus(MatchStatus.COMPLETED);
        m.setWinnerTeam(aWins > bWins ? m.getTeamA() : m.getTeamB());
        matchRepository.save(m);
    }

    private List<Player> playersOfTeam(Team t, Gender g) {
        return new ArrayList<>(playerRepository.findAll().stream()
                .filter(p -> p.getTeam() != null && p.getTeam().getId().equals(t.getId()) && p.getGender() == g)
                .toList());
    }
}
