package com.neml.badminton.seed;

import com.neml.badminton.entity.*;
import com.neml.badminton.repository.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.*;

@Component
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final TeamRepository teamRepository;
    private final PlayerRepository playerRepository;
    private final AuctionStateRepository auctionStateRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.auction.base-price}")
    private long basePrice;

    @Value("${app.auction.team-purse}")
    private long teamPurse;

    public DataSeeder(UserRepository userRepository, TeamRepository teamRepository,
                      PlayerRepository playerRepository, AuctionStateRepository auctionStateRepository,
                      PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.teamRepository = teamRepository;
        this.playerRepository = playerRepository;
        this.auctionStateRepository = auctionStateRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        if (userRepository.count() > 0) {
            return; // Already seeded (idempotent)
        }
        seedTeams();
        seedPlayers();
        seedUsers();
        if (auctionStateRepository.count() == 0) {
            auctionStateRepository.save(AuctionState.builder()
                    .status(AuctionStatus.NOT_STARTED)
                    .timerSeconds(30)
                    .build());
        }
    }

    private void seedTeams() {
        List<Team> teams = List.of(
                Team.builder().name("Chennai Smashers").shortCode("CHE").primaryColor("#FFB800")
                        .logoUrl("https://api.dicebear.com/7.x/shapes/svg?seed=Chennai").build(),
                Team.builder().name("Bangalore Kings").shortCode("BLR").primaryColor("#00F0FF")
                        .logoUrl("https://api.dicebear.com/7.x/shapes/svg?seed=Bangalore").build(),
                Team.builder().name("Mumbai Racquets").shortCode("MUM").primaryColor("#D3FF24")
                        .logoUrl("https://api.dicebear.com/7.x/shapes/svg?seed=Mumbai").build(),
                Team.builder().name("Delhi Dynamos").shortCode("DEL").primaryColor("#FF3B30")
                        .logoUrl("https://api.dicebear.com/7.x/shapes/svg?seed=Delhi").build()
        );
        for (Team t : teams) {
            t.setPurseTotal(BigDecimal.valueOf(teamPurse));
            t.setPurseRemaining(BigDecimal.valueOf(teamPurse));
            t.setMaleCount(0);
            t.setFemaleCount(0);
            teamRepository.save(t);
        }
    }

    private void seedPlayers() {
        // 48 players: 36 male + 12 female to satisfy min-3-female-per-team requirement across 4 teams
        String[] maleFirst = {"Arjun","Vikram","Rohan","Aditya","Karthik","Sourav","Rahul","Nikhil","Vishal",
                "Aryan","Kabir","Dev","Manish","Prakash","Sanjay","Tanmay","Yash","Anmol","Harsh","Zaid",
                "Ishaan","Krishna","Mohit","Nitin","Om","Pranav","Ravi","Siddharth","Tarun","Uday",
                "Varun","Warun","Xavier","Yogesh","Zubin","Aakash","Bharath"};
        String[] femaleFirst = {"Aditi","Priya","Neha","Kavya","Riya","Sanya","Divya","Meera","Tanvi",
                "Anaya","Nisha","Pooja","Isha","Ananya"};
        String[] last = {"Sharma","Verma","Iyer","Nair","Rao","Menon","Patil","Sen","Shetty","Bose",
                "Kapoor","Malhotra","Chopra","Reddy","Kumar","Singh","Das","Roy","Ghosh","Bhat",
                "Rathore","Joshi","Pandey","Mishra","Trivedi","Chatterjee","Mukherjee","Kaul","Bhardwaj"};

        Random rng = new Random(42);
        int order = 1;
        // 36 male
        for (int i = 0; i < 36; i++) {
            String name = maleFirst[i % maleFirst.length] + " " + last[rng.nextInt(last.length)];
            playerRepository.save(Player.builder()
                    .fullName(name)
                    .gender(Gender.MALE)
                    .basePrice(BigDecimal.valueOf(basePrice))
                    .status(PlayerStatus.AVAILABLE)
                    .skillLevel(randSkill(rng))
                    .auctionOrder(order++)
                    .build());
        }
        // 12 female
        for (int i = 0; i < 12; i++) {
            String name = femaleFirst[i % femaleFirst.length] + " " + last[rng.nextInt(last.length)];
            playerRepository.save(Player.builder()
                    .fullName(name)
                    .gender(Gender.FEMALE)
                    .basePrice(BigDecimal.valueOf(basePrice))
                    .status(PlayerStatus.AVAILABLE)
                    .skillLevel(randSkill(rng))
                    .auctionOrder(order++)
                    .build());
        }
    }

    private String randSkill(Random rng) {
        String[] skills = {"Elite","Pro","Advanced","Intermediate"};
        return skills[rng.nextInt(skills.length)];
    }

    private void seedUsers() {
        // Admin
        userRepository.save(User.builder()
                .email("admin@neml.com")
                .passwordHash(passwordEncoder.encode("Admin@123"))
                .fullName("Tournament Admin")
                .role(Role.ADMIN)
                .build());

        // Team owners (one per team)
        List<Team> teams = teamRepository.findAll();
        for (Team t : teams) {
            String email = "owner-" + t.getShortCode().toLowerCase() + "@neml.com";
            userRepository.save(User.builder()
                    .email(email)
                    .passwordHash(passwordEncoder.encode("Owner@123"))
                    .fullName("Owner - " + t.getName())
                    .role(Role.TEAM_OWNER)
                    .team(t)
                    .build());
        }

        // Generic viewer
        userRepository.save(User.builder()
                .email("viewer@neml.com")
                .passwordHash(passwordEncoder.encode("Viewer@123"))
                .fullName("Public Viewer")
                .role(Role.VIEWER)
                .build());
    }
}
