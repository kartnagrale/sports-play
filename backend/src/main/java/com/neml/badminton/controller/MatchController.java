package com.neml.badminton.controller;

import com.neml.badminton.dto.MatchDtos.*;
import com.neml.badminton.service.MatchService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/matches")
public class MatchController {

    private final MatchService matchService;

    public MatchController(MatchService matchService) {
        this.matchService = matchService;
    }

    @GetMapping
    public List<MatchDto> list() {
        return matchService.listAll();
    }

    @GetMapping("/{id}")
    public MatchDto get(@PathVariable UUID id) {
        return matchService.get(id);
    }
}
