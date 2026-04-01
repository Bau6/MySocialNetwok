package com.socialnetwork.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class MessageResponse {
    private Long id;
    private String senderUsername;
    private String receiverUsername;
    private String encryptedContent;
    private LocalDateTime timestamp;
    private boolean read;
}