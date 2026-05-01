package ma.emsi.iot.backend.service;

import ma.emsi.iot.backend.entity.User;
import ma.emsi.iot.backend.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    // ─── Lecture ───

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public User getUserById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Utilisateur introuvable avec l'id : " + id));
    }

    // ─── Écriture (ADMIN) ───

    public User createUser(User user) {
        if (userRepository.existsByUsername(user.getUsername())) {
            throw new IllegalArgumentException("Ce nom d'utilisateur existe déjà");
        }
        if (userRepository.existsByEmail(user.getEmail())) {
            throw new IllegalArgumentException("Cet email est déjà utilisé");
        }
        // Hasher le mot de passe
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        return userRepository.save(user);
    }

    public User updateUser(Long id, User updated) {
        User user = getUserById(id);
        user.setEmail(updated.getEmail());
        user.setRole(updated.getRole());
        user.setEnabled(updated.isEnabled());
        // Si un nouveau mot de passe est fourni, le hasher
        if (updated.getPassword() != null && !updated.getPassword().isBlank()) {
            user.setPassword(passwordEncoder.encode(updated.getPassword()));
        }
        return userRepository.save(user);
    }

    public void deleteUser(Long id) {
        if (!userRepository.existsById(id)) {
            throw new IllegalArgumentException("Utilisateur introuvable avec l'id : " + id);
        }
        userRepository.deleteById(id);
    }
}