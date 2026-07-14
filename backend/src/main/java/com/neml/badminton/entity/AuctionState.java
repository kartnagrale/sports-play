package com.neml.badminton.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "auction_state")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuctionState {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AuctionStatus status = AuctionStatus.NOT_STARTED;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "current_player_id")
    private Player currentPlayer;

    private Integer timerSeconds;
}
