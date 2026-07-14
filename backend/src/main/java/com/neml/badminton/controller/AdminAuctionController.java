package com.neml.badminton.controller;

import com.neml.badminton.dto.Dtos;
import com.neml.badminton.dto.Dtos.*;
import com.neml.badminton.service.AuctionService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/auction")
public class AdminAuctionController {

    private final AuctionService auctionService;

    public AdminAuctionController(AuctionService auctionService) {
        this.auctionService = auctionService;
    }

    @PostMapping("/start")
    public AuctionStateDto start() {
        return auctionService.start();
    }

    @PostMapping("/pause")
    public AuctionStateDto pause() {
        return auctionService.pause();
    }

    @PostMapping("/resume")
    public AuctionStateDto resume() {
        return auctionService.resume();
    }

    @PostMapping("/undo")
    public AuctionStateDto undo() {
        return auctionService.undoLastBid();
    }

    @PostMapping("/sell")
    public AuctionStateDto sell(@RequestBody(required = false) SellRequest req) {
        return auctionService.sell(req);
    }

    @PostMapping("/unsold")
    public AuctionStateDto unsold() {
        return auctionService.markUnsold();
    }

    @PostMapping("/next")
    public AuctionStateDto next() {
        return auctionService.advanceToNextPlayer();
    }

    @PostMapping("/set-current")
    public AuctionStateDto setCurrent(@RequestBody NextPlayerRequest req) {
        return auctionService.setCurrentPlayer(req.playerId());
    }

    @PostMapping("/coin-toss")
    public Map<String, Object> coinToss(@RequestBody Map<String, List<UUID>> body) {
        return auctionService.coinToss(body.get("teamIds"));
    }
}
