package com.neml.badminton.controller;

import com.neml.badminton.dto.Dtos.PlayerDto;
import com.neml.badminton.dto.Dtos.TeamDto;
import com.neml.badminton.repository.PlayerRepository;
import com.neml.badminton.repository.TeamRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api")
public class TeamPlayerController {

    private final TeamRepository teamRepository;
    private final PlayerRepository playerRepository;

    public TeamPlayerController(TeamRepository teamRepository, PlayerRepository playerRepository) {
        this.teamRepository = teamRepository;
        this.playerRepository = playerRepository;
    }

    @GetMapping("/teams")
    public List<TeamDto> teams() {
        return teamRepository.findAll().stream().map(TeamDto::from).toList();
    }

    @GetMapping("/teams/{id}")
    public TeamDto team(@PathVariable UUID id) {
        return teamRepository.findById(id).map(TeamDto::from).orElseThrow();
    }

    @GetMapping("/teams/{id}/players")
    public List<PlayerDto> teamPlayers(@PathVariable UUID id) {
        return playerRepository.findAll().stream()
                .filter(p -> p.getTeam() != null && p.getTeam().getId().equals(id))
                .map(PlayerDto::from).toList();
    }

    @GetMapping("/players")
    public List<PlayerDto> players() {
        return playerRepository.findAllByOrderByAuctionOrderAsc().stream().map(PlayerDto::from).toList();
    }

    @GetMapping("/players/{id}")
    public PlayerDto player(@PathVariable UUID id) {
        return playerRepository.findById(id).map(PlayerDto::from).orElseThrow();
    }
}
