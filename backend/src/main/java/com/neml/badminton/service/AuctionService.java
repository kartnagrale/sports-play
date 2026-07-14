package com.neml.badminton.service;

import com.neml.badminton.dto.Dtos.*;
import com.neml.badminton.entity.*;
import com.neml.badminton.repository.*;
import com.neml.badminton.websocket.AuctionBroadcaster;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.*;

@Service
public class AuctionService {

    private final AuctionStateRepository auctionStateRepository;
    private final PlayerRepository playerRepository;
    private final TeamRepository teamRepository;
    private final BidRepository bidRepository;
    private final AuctionBroadcaster broadcaster;

    @Value("${app.auction.squad-size}")
    private int squadSize;

    @Value("${app.auction.min-female}")
    private int minFemale;

    @Value("${app.auction.min-male}")
    private int minMale;

    @Value("${app.auction.bid-increment}")
    private long bidIncrement;

    public AuctionService(AuctionStateRepository auctionStateRepository,
                          PlayerRepository playerRepository,
                          TeamRepository teamRepository,
                          BidRepository bidRepository,
                          AuctionBroadcaster broadcaster) {
        this.auctionStateRepository = auctionStateRepository;
        this.playerRepository = playerRepository;
        this.teamRepository = teamRepository;
        this.bidRepository = bidRepository;
        this.broadcaster = broadcaster;
    }

    private AuctionState state() {
        List<AuctionState> all = auctionStateRepository.findAll();
        if (all.isEmpty()) {
            AuctionState s = AuctionState.builder().status(AuctionStatus.NOT_STARTED).timerSeconds(30).build();
            return auctionStateRepository.save(s);
        }
        return all.get(0);
    }

    public AuctionStateDto getState() {
        AuctionState s = state();
        List<BidDto> history = bidRepository.findTop50ByOrderByCreatedAtDesc()
                .stream().map(BidDto::from).toList();
        BidDto highest = null;
        if (s.getCurrentPlayer() != null) {
            highest = bidRepository.findFirstByPlayerAndActiveTrueOrderByCreatedAtDesc(s.getCurrentPlayer())
                    .map(BidDto::from).orElse(null);
        }
        List<TeamDto> teams = teamRepository.findAll().stream()
                .sorted(Comparator.comparing(Team::getName))
                .map(TeamDto::from).toList();
        int remaining = playerRepository.findAllByStatusOrderByAuctionOrderAsc(PlayerStatus.AVAILABLE).size();
        PlayerDto current = s.getCurrentPlayer() == null ? null : PlayerDto.from(s.getCurrentPlayer());
        return new AuctionStateDto(s.getStatus(), current, highest, history, teams, remaining);
    }

    @Transactional
    public AuctionStateDto start() {
        AuctionState s = state();
        if (s.getStatus() == AuctionStatus.COMPLETED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Auction already completed");
        }
        s.setStatus(AuctionStatus.RUNNING);
        if (s.getCurrentPlayer() == null) {
            Player next = pickNextPlayer();
            if (next != null) {
                next.setStatus(PlayerStatus.ON_BLOCK);
                playerRepository.save(next);
                s.setCurrentPlayer(next);
            }
        }
        auctionStateRepository.save(s);
        AuctionStateDto dto = getState();
        broadcaster.broadcastState(dto);
        return dto;
    }

    @Transactional
    public AuctionStateDto pause() {
        AuctionState s = state();
        s.setStatus(AuctionStatus.PAUSED);
        auctionStateRepository.save(s);
        AuctionStateDto dto = getState();
        broadcaster.broadcastState(dto);
        return dto;
    }

    @Transactional
    public AuctionStateDto resume() {
        AuctionState s = state();
        s.setStatus(AuctionStatus.RUNNING);
        auctionStateRepository.save(s);
        AuctionStateDto dto = getState();
        broadcaster.broadcastState(dto);
        return dto;
    }

    @Transactional
    public AuctionStateDto placeBid(PlaceBidRequest req) {
        AuctionState s = state();
        if (s.getStatus() != AuctionStatus.RUNNING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Auction is not running");
        }
        Player player = playerRepository.findById(req.playerId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Player not found"));
        if (s.getCurrentPlayer() == null || !s.getCurrentPlayer().getId().equals(player.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Player is not on the auction block");
        }
        Team team = teamRepository.findById(req.teamId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Team not found"));

        BigDecimal amount = req.amount();
        BigDecimal currentHighest = bidRepository.findFirstByPlayerAndActiveTrueOrderByCreatedAtDesc(player)
                .map(Bid::getAmount).orElse(player.getBasePrice().subtract(BigDecimal.valueOf(bidIncrement)));
        if (amount.compareTo(currentHighest.add(BigDecimal.valueOf(bidIncrement))) < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Bid must be at least " + currentHighest.add(BigDecimal.valueOf(bidIncrement)));
        }
        // Solvency check: team must have enough remaining purse to afford this bid AND
        // still fill remaining slots (each remaining slot needs at least base price of cheapest available).
        validateTeamSolvency(team, player, amount);

        Bid bid = Bid.builder().player(player).team(team).amount(amount).active(true).build();
        bidRepository.save(bid);
        AuctionStateDto dto = getState();
        broadcaster.broadcastState(dto);
        broadcaster.broadcastEvent("BID_PLACED", Map.of(
                "teamName", team.getName(), "amount", amount, "player", player.getFullName()));
        return dto;
    }

    private void validateTeamSolvency(Team team, Player player, BigDecimal bidAmount) {
        int filled = team.getMaleCount() + team.getFemaleCount();
        int slotsLeft = squadSize - filled - 1; // minus 1 for this potential purchase
        int maleNeeded = Math.max(0, minMale - team.getMaleCount() - (player.getGender() == Gender.MALE ? 1 : 0));
        int femaleNeeded = Math.max(0, minFemale - team.getFemaleCount() - (player.getGender() == Gender.FEMALE ? 1 : 0));

        if (filled >= squadSize) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Team squad is already full");
        }
        // Gender cap: cannot exceed slot allocations
        int malesAfter = team.getMaleCount() + (player.getGender() == Gender.MALE ? 1 : 0);
        int femalesAfter = team.getFemaleCount() + (player.getGender() == Gender.FEMALE ? 1 : 0);
        // Enforce that after purchase, we can still reach min-female and min-male with remaining slots
        int remainingSlots = squadSize - filled - 1;
        int stillNeededMale = Math.max(0, minMale - malesAfter);
        int stillNeededFemale = Math.max(0, minFemale - femalesAfter);
        if (stillNeededMale + stillNeededFemale > remainingSlots) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Buying this player violates squad composition (min 3F, 9M).");
        }
        // Purse solvency: remaining purse after this bid must cover remaining slots × basePrice
        BigDecimal minReserve = player.getBasePrice().multiply(BigDecimal.valueOf(slotsLeft));
        BigDecimal remainingAfter = team.getPurseRemaining().subtract(bidAmount);
        if (remainingAfter.compareTo(minReserve) < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Team cannot afford this bid — insufficient purse reserve for remaining " + slotsLeft + " slots.");
        }
    }

    @Transactional
    public AuctionStateDto undoLastBid() {
        AuctionState s = state();
        if (s.getCurrentPlayer() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No active player");
        }
        Optional<Bid> lastActive = bidRepository.findFirstByPlayerAndActiveTrueOrderByCreatedAtDesc(s.getCurrentPlayer());
        if (lastActive.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No bids to undo");
        }
        Bid b = lastActive.get();
        b.setActive(false);
        bidRepository.save(b);
        AuctionStateDto dto = getState();
        broadcaster.broadcastState(dto);
        broadcaster.broadcastEvent("BID_UNDONE", Map.of("teamName", b.getTeam().getName(), "amount", b.getAmount()));
        return dto;
    }

    @Transactional
    public AuctionStateDto sell(SellRequest req) {
        AuctionState s = state();
        if (s.getCurrentPlayer() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No active player");
        }
        Player p = s.getCurrentPlayer();
        Team team;
        BigDecimal amount;
        if (req != null && req.teamId() != null) {
            team = teamRepository.findById(req.teamId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Team not found"));
            amount = req.amount() != null ? req.amount() : p.getBasePrice();
            validateTeamSolvency(team, p, amount);
        } else {
            Bid highest = bidRepository.findFirstByPlayerAndActiveTrueOrderByCreatedAtDesc(p)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "No bids to sell"));
            team = highest.getTeam();
            amount = highest.getAmount();
        }
        p.setStatus(PlayerStatus.SOLD);
        p.setTeam(team);
        p.setSoldPrice(amount);
        playerRepository.save(p);

        team.setPurseRemaining(team.getPurseRemaining().subtract(amount));
        if (p.getGender() == Gender.MALE) team.setMaleCount(team.getMaleCount() + 1);
        else team.setFemaleCount(team.getFemaleCount() + 1);
        teamRepository.save(team);

        s.setCurrentPlayer(null);
        auctionStateRepository.save(s);
        broadcaster.broadcastEvent("PLAYER_SOLD", Map.of(
                "player", p.getFullName(), "teamName", team.getName(),
                "amount", amount));
        return advanceToNextPlayer();
    }

    @Transactional
    public AuctionStateDto markUnsold() {
        AuctionState s = state();
        if (s.getCurrentPlayer() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No active player");
        }
        Player p = s.getCurrentPlayer();
        p.setStatus(PlayerStatus.UNSOLD);
        playerRepository.save(p);
        s.setCurrentPlayer(null);
        auctionStateRepository.save(s);
        broadcaster.broadcastEvent("PLAYER_UNSOLD", Map.of("player", p.getFullName()));
        return advanceToNextPlayer();
    }

    @Transactional
    public AuctionStateDto advanceToNextPlayer() {
        AuctionState s = state();
        Player next = pickNextPlayer();
        if (next == null) {
            s.setStatus(AuctionStatus.COMPLETED);
            s.setCurrentPlayer(null);
            auctionStateRepository.save(s);
        } else {
            next.setStatus(PlayerStatus.ON_BLOCK);
            playerRepository.save(next);
            s.setCurrentPlayer(next);
            auctionStateRepository.save(s);
        }
        AuctionStateDto dto = getState();
        broadcaster.broadcastState(dto);
        return dto;
    }

    private Player pickNextPlayer() {
        return playerRepository.findAllByStatusOrderByAuctionOrderAsc(PlayerStatus.AVAILABLE).stream().findFirst().orElse(null);
    }

    @Transactional
    public AuctionStateDto setCurrentPlayer(UUID playerId) {
        AuctionState s = state();
        Player p = playerRepository.findById(playerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Player not found"));
        if (p.getStatus() != PlayerStatus.AVAILABLE && p.getStatus() != PlayerStatus.UNSOLD) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Player is not available");
        }
        // Reset previous on-block player back to available (if any)
        if (s.getCurrentPlayer() != null) {
            Player prev = s.getCurrentPlayer();
            if (prev.getStatus() == PlayerStatus.ON_BLOCK) {
                prev.setStatus(PlayerStatus.AVAILABLE);
                playerRepository.save(prev);
            }
        }
        p.setStatus(PlayerStatus.ON_BLOCK);
        playerRepository.save(p);
        s.setCurrentPlayer(p);
        auctionStateRepository.save(s);
        AuctionStateDto dto = getState();
        broadcaster.broadcastState(dto);
        return dto;
    }

    public Map<String, Object> coinToss(List<UUID> teamIds) {
        if (teamIds == null || teamIds.size() < 2) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "At least 2 teams required for coin toss");
        }
        UUID winner = teamIds.get(new Random().nextInt(teamIds.size()));
        Team t = teamRepository.findById(winner).orElseThrow();
        Map<String, Object> result = Map.of("winnerTeamId", winner.toString(), "winnerTeamName", t.getName());
        broadcaster.broadcastEvent("COIN_TOSS", result);
        return result;
    }
}
