package com.socialnetwork.dto;

import lombok.Data;

@Data
public class RegisterRequest {
    private String username;
    private String phone;
    private String password;
    private String email; // необязательный
}