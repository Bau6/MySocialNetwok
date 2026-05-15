package com.socialnetwork.dto.request;

import com.socialnetwork.model.MessageType;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class MessageRequest {
    @NotBlank(message = "Receiver username is required")
    private String receiverUsername;

    private String senderUsername;   // новое поле

    private String encryptedContent;
    private String encryptedSessionKey;
    private String iv;

    private String encryptedContentForSender;
    private String encryptedSessionKeyForSender;
    private String ivForSender;

    private MessageType type = MessageType.TEXT;
    private String fileUrl;
    private String fileName;
    private Long fileSize;
    private Long replyToId;
    private Boolean circle;
}