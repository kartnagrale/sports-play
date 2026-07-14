package com.neml.badminton.controller;

import com.neml.badminton.dto.MatchDtos.*;
import com.neml.badminton.service.AnalyticsService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    public AnalyticsController(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    @GetMapping("/standings")
    public List<StandingDto> standings(@RequestParam(defaultValue = "true") boolean penalties) {
        return analyticsService.standings(penalties);
    }

    @GetMapping("/format-leaders")
    public List<FormatLeaderDto> formatLeaders() {
        return analyticsService.formatLeaders();
    }

    @GetMapping("/team/{id}")
    public TeamAnalysisDto team(@PathVariable UUID id) {
        return analyticsService.teamAnalysis(id);
    }

    @GetMapping("/top-performers")
    public List<TopPerformerDto> topPerformers(@RequestParam(defaultValue = "10") int limit) {
        return analyticsService.topPerformers(limit);
    }
}
