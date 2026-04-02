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
    public ResponseEntity<MessageResponse> sendMessage(Authentication authentication,
                                                       @RequestBody MessageRequest request) {
        String username = authentication.getName();
        return ResponseEntity.ok(messageService.sendMessage(username, request));
    }

    @GetMapping("/conversation/{username}")
    public ResponseEntity<List<MessageResponse>> getConversation(Authentication authentication,
                                                                 @PathVariable String username) {
        String currentUser = authentication.getName();
        return ResponseEntity.ok(messageService.getConversation(currentUser, username));
    }

    // Создать ключ чата (при начале диалога)
    @PostMapping("/create-chat/{otherUsername}")
    public ResponseEntity<?> createChat(Authentication authentication,
                                        @PathVariable String otherUsername) {
        String currentUser = authentication.getName();
        String chatKey = messageService.createChatKey(currentUser, otherUsername);
        Map<String, String> response = new HashMap<>();
        response.put("chatKey", chatKey);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/chat-key/{otherUsername}")
    public ResponseEntity<?> getChatKey(Authentication authentication,
                                        @PathVariable String otherUsername) {
        String currentUser = authentication.getName();
        String chatKey = messageService.getChatKey(currentUser, otherUsername);
        Map<String, String> response = new HashMap<>();
        response.put("chatKey", chatKey != null ? chatKey : "");
        return ResponseEntity.ok(response);
    }

    // Получить список пользователей, с которыми есть чаты (плюс поиск)
    @GetMapping("/users")
    public ResponseEntity<?> getUsers(Authentication authentication,
                                      @RequestParam(required = false) String search) {
        String currentUser = authentication.getName();
        List<com.socialnetwork.model.User> result;
        if (search != null && !search.trim().isEmpty()) {
            // поиск по телефону или логину (точное совпадение)
            result = userService.searchUsers(search.trim());
        } else {
            // без поиска - только те, с кем есть чаты
            result = userService.getUsersWithChats(currentUser);
        }
        // удаляем текущего пользователя из списка
        result.removeIf(u -> u.getUsername().equals(currentUser));
        return ResponseEntity.ok(result);
    }
}