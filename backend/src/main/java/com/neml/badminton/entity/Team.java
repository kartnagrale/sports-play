package com.neml.badminton.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "teams")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Team {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true)
    private String name;

    @Column(nullable = false)
    private String shortCode;

    private String logoUrl;

    private String primaryColor;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal purseTotal;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal purseRemaining;

    @Column(nullable = false)
    private Integer maleCount = 0;

    @Column(nullable = false)
    private Integer femaleCount = 0;

    @OneToMany(mappedBy = "team", fetch = FetchType.LAZY)
    @Builder.Default
    private List<Player> players = new ArrayList<>();
}
