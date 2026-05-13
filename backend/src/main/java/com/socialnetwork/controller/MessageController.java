package com.socialnetwork.controller;

import com.socialnetwork.dto.request.MessageRequest;
import com.socialnetwork.dto.response.ChatPreviewResponse;
import com.socialnetwork.dto.response.MessageResponse;
import com.socialnetwork.service.MessageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/messages")
@RequiredArgsConstructor
public class MessageController {

    private final MessageService messageService;

    @PostMapping("/send-encrypted")
    public ResponseEntity<MessageResponse> sendEncryptedMessage(
            Authentication authentication,
            @Valid @RequestBody MessageRequest request) {
        return ResponseEntity.ok(messageService.sendEncryptedMessage(authentication.getName(), request));
    }

    @GetMapping("/conversation/{username}")
    public ResponseEntity<List<MessageResponse>> getConversation(
            Authentication authentication,
            @PathVariable String username) {
        return ResponseEntity.ok(messageService.getConversation(authentication.getName(), username));
    }

    // НОВЫЙ ЭНДПОИНТ для пагинации
    @GetMapping("/conversation/page/{username}")
    public ResponseEntity<Page<MessageResponse>> getConversationPage(
            Authentication authentication,
            @PathVariable String username,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "100") int size) {
        String currentUser = authentication.getName();
        PageRequest pageable = PageRequest.of(page, size, Sort.by("timestamp").descending());
        return ResponseEntity.ok(messageService.getConversationPage(currentUser, username, pageable));
    }

    @PostMapping("/mark-read/{senderUsername}")
    public ResponseEntity<Map<String, String>> markMessagesAsRead(
            Authentication authentication,
            @PathVariable String senderUsername) {
        messageService.markMessagesAsRead(authentication.getName(), senderUsername);
        return ResponseEntity.ok(Map.of("message", "Marked as read"));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> getUnreadCount(Authentication authentication) {
        return ResponseEntity.ok(Map.of("count", messageService.getUnreadCount(authentication.getName())));
    }

    @GetMapping("/chats")
    public ResponseEntity<List<ChatPreviewResponse>> getChats(Authentication authentication) {
        return ResponseEntity.ok(messageService.getChatPreviews(authentication.getName()));
    }
}