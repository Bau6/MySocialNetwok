package com.socialnetwork.dto;

import lombok.Data;

@Data
public class MessageRequest {
    private String receiverUsername;
    private String encryptedContent;
}