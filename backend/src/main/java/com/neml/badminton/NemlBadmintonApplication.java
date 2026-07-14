package com.neml.badminton;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class NemlBadmintonApplication {
    public static void main(String[] args) {
        SpringApplication.run(NemlBadmintonApplication.class, args);
    }
}
