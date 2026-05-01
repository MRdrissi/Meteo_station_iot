package ma.emsi.iot.backend.controller;

import ma.emsi.iot.backend.dto.AuthResponse;
import ma.emsi.iot.backend.dto.LoginRequest;
import ma.emsi.iot.backend.dto.RegisterRequest;
import ma.emsi.iot.backend.entity.User;
import ma.emsi.iot.backend.repository.UserRepository;
import ma.emsi.iot.backend.service.AuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final UserRepository userRepository;

    public AuthController(AuthService authService, UserRepository userRepository) {
        this.authService = authService;
        this.userRepository = userRepository;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@RequestBody RegisterRequest request) {
        return ResponseEntity.ok(authService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).body("Non authentifié");
        }
        User user = userRepository.findByUsername(principal.getName())
                .orElseThrow();
        return ResponseEntity.ok(Map.of(
                "id", user.getId(),
                "username", user.getUsername(),
                "email", user.getEmail(),
                "role", user.getRole().name()
        ));
    }
}