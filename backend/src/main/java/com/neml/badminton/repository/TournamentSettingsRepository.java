package com.neml.badminton.repository;

import com.neml.badminton.entity.TournamentSettings;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface TournamentSettingsRepository extends JpaRepository<TournamentSettings, UUID> {
}
