package com.socialnetwork.dto.response;

import com.socialnetwork.model.MessageType;
import lombok.Data;
import java.time.LocalDateTime;

@Data
public class MessageResponse {
    private Long id;
    private String senderUsername;
    private String receiverUsername;

    // Для получателя
    private String encryptedContent;
    private String encryptedSessionKey;
    private String iv;

    // Для отправителя
    private String encryptedContentForSender;
    private String encryptedSessionKeyForSender;
    private String ivForSender;

    private LocalDateTime timestamp;
    private boolean read;
    private MessageType type;
    private String fileUrl;
    private String fileName;
    private Long fileSize;
    private Long replyToId;
}