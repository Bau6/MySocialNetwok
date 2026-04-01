package com.socialnetwork.controller;

import com.socialnetwork.dto.MessageRequest;
import com.socialnetwork.dto.MessageResponse;
import com.socialnetwork.service.MessageService;
import com.socialnetwork.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/messages")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class MessageController {

    private final MessageService messageService;
    private final UserService userService;

    @PostMapping("/send")
    public ResponseEntity<MessageResponse> sendMessage(
            Authentication authentication,
            @RequestBody MessageRequest request) {
        String username = authentication.getName();
        return ResponseEntity.ok(messageService.sendMessage(username, request));
    }

    @GetMapping("/conversation/{username}")
    public ResponseEntity<List<MessageResponse>> getConversation(
            Authentication authentication,
            @PathVariable String username) {
        String currentUser = authentication.getName();
        return ResponseEntity.ok(messageService.getConversation(currentUser, username));
    }

    @GetMapping("/public-key/{username}")
    public ResponseEntity<?> getPublicKey(@PathVariable String username) {
        String publicKey = userService.getPublicKey(username);
        Map<String, String> response = new HashMap<>();
        response.put("publicKey", publicKey);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/users")
    public ResponseEntity<?> getAllUsers(Authentication authentication) {
        String currentUser = authentication.getName();
        List<com.socialnetwork.model.User> users = userService.getAllUsers();
        users.removeIf(user -> user.getUsername().equals(currentUser));
        return ResponseEntity.ok(users);
    }
}