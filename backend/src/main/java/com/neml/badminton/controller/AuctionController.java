package com.neml.badminton.controller;

import com.neml.badminton.dto.Dtos;
import com.neml.badminton.dto.Dtos.*;
import com.neml.badminton.repository.BidRepository;
import com.neml.badminton.service.AuctionService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/auction")
public class AuctionController {

    private final AuctionService auctionService;
    private final BidRepository bidRepository;

    public AuctionController(AuctionService auctionService, BidRepository bidRepository) {
        this.auctionService = auctionService;
        this.bidRepository = bidRepository;
    }

    @GetMapping("/state")
    public AuctionStateDto state() {
        return auctionService.getState();
    }

    @GetMapping("/history")
    public List<BidDto> history() {
        return bidRepository.findTop50ByOrderByCreatedAtDesc().stream().map(BidDto::from).toList();
    }

    @PostMapping("/bid")
    public AuctionStateDto placeBid(@RequestBody PlaceBidRequest req) {
        return auctionService.placeBid(req);
    }
}
