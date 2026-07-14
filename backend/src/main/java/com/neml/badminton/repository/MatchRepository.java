package com.neml.badminton.repository;

import com.neml.badminton.entity.Match;
import com.neml.badminton.entity.MatchStatus;
import com.neml.badminton.entity.Team;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface MatchRepository extends JpaRepository<Match, UUID> {
    List<Match> findAllByOrderByMatchNumberAsc();
    List<Match> findAllByStatusOrderByScheduledAtAsc(MatchStatus status);
}
