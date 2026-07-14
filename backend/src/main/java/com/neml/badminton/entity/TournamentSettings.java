package com.neml.badminton.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "tournament_settings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TournamentSettings {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private Integer pointsPerWin = 3;

    @Column(nullable = false)
    private Integer penaltyPerUnplayed = 2;

    @ElementCollection(fetch = FetchType.EAGER)
    @Enumerated(EnumType.STRING)
    @CollectionTable(name = "tie_breaker_order",
            joinColumns = @JoinColumn(name = "settings_id"))
    @Column(name = "tie_breaker", length = 32)
    @OrderColumn(name = "position")
    @Builder.Default
    private List<TieBreaker> tieBreakerOrder = new ArrayList<>();
}
