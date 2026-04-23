package com.socialnetwork.controller;

import com.socialnetwork.model.User;
import com.socialnetwork.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class UserController {
    private final UserService userService;

    @GetMapping("/{username}/status")
    public ResponseEntity<?> getUserStatus(@PathVariable String username) {
        try {
            boolean isOnline = userService.isUserOnline(username);
            Map<String, Object> response = new HashMap<>();
            response.put("online", isOnline);

            // Получаем пользователя для lastSeen
            try {
                User user = userService.findByUsername(username);
                if (user.getLastSeen() != null) {
                    response.put("lastSeen", user.getLastSeen().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
                } else {
                    response.put("lastSeen", null);
                }
            } catch (IllegalArgumentException e) {
                response.put("lastSeen", null);
            }

            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", "Failed to get user status");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }
}