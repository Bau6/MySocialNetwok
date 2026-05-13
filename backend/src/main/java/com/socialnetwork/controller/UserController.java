package com.socialnetwork.controller;

import com.socialnetwork.dto.response.UserResponse;
import com.socialnetwork.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/profile")
    public ResponseEntity<UserResponse> getProfile(Authentication authentication) {
        String username = authentication.getName();
        return ResponseEntity.ok(new UserResponse(userService.findByUsername(username)));
    }

    @GetMapping("/{username}")
    public ResponseEntity<UserResponse> getUser(@PathVariable String username) {
        return ResponseEntity.ok(new UserResponse(userService.findByUsername(username)));
    }

    @GetMapping("/search")
    public ResponseEntity<List<UserResponse>> searchUsers(@RequestParam String query) {
        return ResponseEntity.ok(userService.searchUsers(query));
    }

    @GetMapping("/{username}/status")
    public ResponseEntity<Map<String, Object>> getUserStatus(@PathVariable String username) {
        Map<String, Object> response = new HashMap<>();
        response.put("online", userService.isUserOnline(username));
        response.put("lastSeen", userService.findByUsername(username).getLastSeen());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{username}/public-key")
    public ResponseEntity<Map<String, String>> getUserPublicKey(@PathVariable String username) {
        String publicKey = userService.getPublicKey(username);
        Map<String, String> response = new HashMap<>();
        response.put("publicKey", publicKey);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/with-keys")
    public ResponseEntity<List<UserResponse>> getAllUsersWithPublicKeys(Authentication authentication) {
        return ResponseEntity.ok(userService.getAllUsersWithPublicKeys(authentication.getName()));
    }

    @GetMapping("/chats")
    public ResponseEntity<List<UserResponse>> getUserChats(Authentication authentication) {
        return ResponseEntity.ok(userService.getChatUsers(authentication.getName()));
    }
}