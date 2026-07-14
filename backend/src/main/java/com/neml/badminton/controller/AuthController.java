package com.neml.badminton.controller;

import com.neml.badminton.dto.AuthDtos;
import com.neml.badminton.entity.User;
import com.neml.badminton.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public ResponseEntity<AuthDtos.AuthResponse> login(@Valid @RequestBody AuthDtos.LoginRequest req) {
        return ResponseEntity.ok(authService.login(req));
    }

    @GetMapping("/me")
    public ResponseEntity<AuthDtos.UserInfo> me(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(authService.me(user));
    }
}
