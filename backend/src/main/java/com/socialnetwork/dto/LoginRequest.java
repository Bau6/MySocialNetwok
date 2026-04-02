package com.socialnetwork.dto;

import lombok.Data;

@Data
public class LoginRequest {
    private String login; // может быть username или phone
    private String password;
}