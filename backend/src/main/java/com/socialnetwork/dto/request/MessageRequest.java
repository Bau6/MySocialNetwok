package com.socialnetwork.dto.request;

import com.socialnetwork.model.MessageType;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class MessageRequest {
    @NotBlank(message = "Receiver username is required")
    private String receiverUsername;

    @NotBlank(message = "Encrypted content is required")
    private String encryptedContent;

    @NotBlank(message = "Encrypted session key is required")
    private String encryptedSessionKey;

    @NotBlank(message = "IV is required")
    private String iv;

    // Для отправителя
    private String encryptedContentForSender;
    private String encryptedSessionKeyForSender;
    private String ivForSender;

    private MessageType type = MessageType.TEXT;
    private String fileUrl;
    private String fileName;
    private Long fileSize;
    private Long replyToId;
}