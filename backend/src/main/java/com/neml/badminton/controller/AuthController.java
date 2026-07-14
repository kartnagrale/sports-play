package com.neml.badminton.controller;

import com.neml.badminton.dto.AuthDtos;
import com.neml.badminton.entity.User;
import com.neml.badminton.security.JwtAuthFilter;
import com.neml.badminton.service.AuthService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final int COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24; // 1 day, matches JWT expiration

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public ResponseEntity<AuthDtos.AuthResponse> login(@Valid @RequestBody AuthDtos.LoginRequest req,
                                                       HttpServletResponse response) {
        AuthDtos.AuthResponse auth = authService.login(req);
        response.addHeader("Set-Cookie", buildCookie(auth.token(), COOKIE_MAX_AGE_SECONDS));
        return ResponseEntity.ok(auth);
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletResponse response) {
        response.addHeader("Set-Cookie", buildCookie("", 0));
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    public ResponseEntity<AuthDtos.UserInfo> me(@AuthenticationPrincipal User user) {
        if (user == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(authService.me(user));
    }

    private String buildCookie(String value, int maxAgeSeconds) {
        // httpOnly + SameSite=Lax + Path=/. Secure is required in browsers when SameSite=None; we use Lax so it's optional.
        return String.format(
                "%s=%s; Max-Age=%d; Path=/; HttpOnly; SameSite=Lax; Secure",
                JwtAuthFilter.COOKIE_NAME, value, maxAgeSeconds
        );
    }
}
