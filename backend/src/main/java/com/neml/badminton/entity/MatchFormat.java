package com.neml.badminton.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "match_formats")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MatchFormat {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "match_id", nullable = false)
    private Match match;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private FormatType formatType;

    @Column(nullable = false)
    private Integer formatOrder;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
            name = "format_side_a_players",
            joinColumns = @JoinColumn(name = "format_id"),
            inverseJoinColumns = @JoinColumn(name = "player_id"))
    @Builder.Default
    private List<Player> sideAPlayers = new ArrayList<>();

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
            name = "format_side_b_players",
            joinColumns = @JoinColumn(name = "format_id"),
            inverseJoinColumns = @JoinColumn(name = "player_id"))
    @Builder.Default
    private List<Player> sideBPlayers = new ArrayList<>();

    @Column(nullable = false)
    private Integer scoreA = 0;

    @Column(nullable = false)
    private Integer scoreB = 0;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "winner_team_id")
    private Team winnerTeam;

    @Column(nullable = false)
    private Boolean completed = false;
}
