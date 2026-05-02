package ma.emsi.iot.backend.service;

import ma.emsi.iot.backend.dto.CreateUserRequest;
import ma.emsi.iot.backend.dto.UpdateUserRequest;
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

    public User createUser(CreateUserRequest req) {
        if (userRepository.existsByUsername(req.getUsername()))
            throw new IllegalArgumentException("Nom d'utilisateur déjà pris");
        if (userRepository.existsByEmail(req.getEmail()))
            throw new IllegalArgumentException("Email déjà utilisé");

        User user = new User();
        user.setUsername(req.getUsername());
        user.setEmail(req.getEmail());
        user.setPassword(passwordEncoder.encode(req.getPassword()));  // ✅ plus jamais null
        user.setRole(User.Role.valueOf(req.getRole() != null ? req.getRole() : "USER"));
        return userRepository.save(user);
    }

    public User updateUser(Long id, UpdateUserRequest req) {
        User user = getUserById(id);

        // Vérifier que le nouvel email n'appartient pas à un AUTRE utilisateur
        if (!user.getEmail().equals(req.getEmail())
                && userRepository.existsByEmail(req.getEmail())) {
            throw new IllegalArgumentException("Cet email est déjà utilisé");
        }

        user.setEmail(req.getEmail());
        user.setRole(User.Role.valueOf(req.getRole()));
        user.setEnabled(req.getEnabled());
        if (req.getPassword() != null && !req.getPassword().isBlank()) {
            user.setPassword(passwordEncoder.encode(req.getPassword()));
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