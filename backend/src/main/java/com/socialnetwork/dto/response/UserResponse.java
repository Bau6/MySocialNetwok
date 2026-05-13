package com.socialnetwork.dto.response;

import com.socialnetwork.model.User;
import lombok.Data;

@Data
public class UserResponse {
    private Long id;
    private String username;
    private String phone;
    private String email;
    private String fullName;
    private String avatarUrl;
    private String publicKey;
    private String encryptedPrivateKey;   // для передачи клиенту при логине
    private boolean online;
    private String lastSeen;

    public UserResponse(User user) {
        this.id = user.getId();
        this.username = user.getUsername();
        this.phone = user.getPhone();
        this.email = user.getEmail();
        this.fullName = user.getFullName();
        this.avatarUrl = user.getAvatarUrl();
        this.publicKey = user.getPublicKey();
        this.encryptedPrivateKey = user.getEncryptedPrivateKey();
        this.online = user.isOnline();
        this.lastSeen = user.getLastSeen() != null ? user.getLastSeen().toString() : null;
    }
}