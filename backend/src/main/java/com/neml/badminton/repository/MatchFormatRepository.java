package com.neml.badminton.repository;

import com.neml.badminton.entity.MatchFormat;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface MatchFormatRepository extends JpaRepository<MatchFormat, UUID> {
}
