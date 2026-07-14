package com.neml.badminton.controller;

import com.neml.badminton.dto.MatchDtos.*;
import com.neml.badminton.service.MatchService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/admin/matches")
public class AdminMatchController {

    private final MatchService matchService;

    public AdminMatchController(MatchService matchService) {
        this.matchService = matchService;
    }

    @PostMapping
    public MatchDto create(@RequestBody CreateMatchRequest req) {
        return matchService.create(req);
    }

    @PostMapping("/formats/{formatId}/assign")
    public MatchDto assign(@PathVariable UUID formatId, @RequestBody AssignPlayersRequest req) {
        return matchService.assignPlayers(formatId, req);
    }

    @PostMapping("/formats/{formatId}/result")
    public MatchDto result(@PathVariable UUID formatId, @RequestBody ReportFormatResultRequest req) {
        return matchService.reportFormatResult(formatId, req);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        matchService.deleteMatch(id);
        return ResponseEntity.noContent().build();
    }
}
