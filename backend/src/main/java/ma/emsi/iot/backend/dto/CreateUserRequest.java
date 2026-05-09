package ma.emsi.iot.backend.dto;

import lombok.Data;

@Data
public class CreateUserRequest {
    private String username;
    private String email;
    private String password;
    private String role;       // "USER" ou "ADMIN"
}
