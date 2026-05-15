package com.socialnetwork.dto.response;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class ChatPreviewResponse {
    private String username;
    private String fullName;
    private String avatarUrl;
    private boolean online;
    private LocalDateTime lastSeen;
    private String lastMessageEncrypted;
    private String lastMessageIv;
    private String lastMessageEncryptedSessionKey;
    private LocalDateTime lastMessageTime;
    private long unreadCount;
    private String lastMessageType;
}