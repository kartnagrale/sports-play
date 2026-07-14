package com.neml.badminton.repository;

import com.neml.badminton.entity.Bid;
import com.neml.badminton.entity.Player;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BidRepository extends JpaRepository<Bid, UUID> {
    List<Bid> findAllByPlayerOrderByCreatedAtDesc(Player player);
    Optional<Bid> findFirstByPlayerAndActiveTrueOrderByCreatedAtDesc(Player player);
    List<Bid> findTop50ByOrderByCreatedAtDesc();
}
