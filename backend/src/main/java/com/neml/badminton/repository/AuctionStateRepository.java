package com.neml.badminton.repository;

import com.neml.badminton.entity.AuctionState;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface AuctionStateRepository extends JpaRepository<AuctionState, UUID> {
}
