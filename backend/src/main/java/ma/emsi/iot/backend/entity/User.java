package ma.emsi.iot.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity @Table(name = "app_users")
@Data @NoArgsConstructor @AllArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String username;

    @Column(nullable = false)
    private String password;        // hashé avec BCrypt

    @Column(unique = true, nullable = false)
    private String email;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role = Role.USER;

    private boolean enabled = true;

    private LocalDateTime createdAt = LocalDateTime.now();

    // ─── Enum des rôles ───
    public enum Role {
        USER,       // Lecture seule (consulter les données)
        ADMIN       // Lecture + écriture (modifier stations, gérer users…)
    }
}