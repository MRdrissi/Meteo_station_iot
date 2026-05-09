package ma.emsi.iot.backend.dto;

import lombok.Data;

@Data
public class UpdateUserRequest {
    private String email;
    private String role;
    private Boolean enabled;
    private String password;  // null = pas de changement, non-null = nouveau mdp
}
