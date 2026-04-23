package com.socialnetwork.service;

import com.socialnetwork.dto.MessageRequest;
import com.socialnetwork.dto.MessageResponse;
import com.socialnetwork.model.ChatKey;
import com.socialnetwork.model.Message;
import com.socialnetwork.model.User;
import com.socialnetwork.repository.ChatKeyRepository;
import com.socialnetwork.repository.MessageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MessageService {
    private final MessageRepository messageRepository;
    private final ChatKeyRepository chatKeyRepository;
    private final UserService userService;

    @Transactional
    public String createChatKey(String currentUsername, String otherUsername) {
        User user1 = userService.findByUsername(currentUsername);
        User user2 = userService.findByUsername(otherUsername);

        // Проверяем, существует ли уже ключ
        return chatKeyRepository.findChatKeyBetweenUsers(user1, user2)
                .map(ChatKey::getKeyValue)
                .orElseGet(() -> {
                    String newKey = UUID.randomUUID().toString().replace("-", "") +
                            UUID.randomUUID().toString().replace("-", "");
                    ChatKey key = new ChatKey();
                    key.setUser1(user1);
                    key.setUser2(user2);
                    key.setKeyValue(newKey);
                    key.setActive(true);
                    chatKeyRepository.save(key);
                    return newKey;
                });
    }

    public String getChatKey(String currentUsername, String otherUsername) {
        User user1 = userService.findByUsername(currentUsername);
        User user2 = userService.findByUsername(otherUsername);
        return chatKeyRepository.findChatKeyBetweenUsers(user1, user2)
                .map(ChatKey::getKeyValue)
                .orElse(null);
    }

    @Transactional
    public MessageResponse sendMessage(String senderUsername, MessageRequest request) {
        User sender = userService.findByUsername(senderUsername);
        User receiver = userService.findByUsername(request.getReceiverUsername());

        // Автоматически создаем ключ чата, если его нет
        String chatKeyValue = chatKeyRepository.findChatKeyBetweenUsers(sender, receiver)
                .map(ChatKey::getKeyValue)
                .orElseGet(() -> createChatKey(senderUsername, request.getReceiverUsername()));

        ChatKey chatKey = chatKeyRepository.findByKeyValue(chatKeyValue)
                .orElseThrow(() -> new RuntimeException("Chat key not found"));

        Message message = new Message();
        message.setSender(sender);
        message.setReceiver(receiver);
        message.setEncryptedContent(request.getEncryptedContent());
        message.setTimestamp(LocalDateTime.now());
        message.setRead(false);
        message.setChatKeyId(chatKey.getId());

        Message saved = messageRepository.save(message);
        return mapToResponse(saved);
    }

    public List<MessageResponse> getConversation(String username1, String username2) {
        User user1 = userService.findByUsername(username1);
        User user2 = userService.findByUsername(username2);

        List<Message> from1to2 = messageRepository.findBySenderAndReceiverOrderByTimestampAsc(user1, user2);
        List<Message> from2to1 = messageRepository.findBySenderAndReceiverOrderByTimestampAsc(user2, user1);

        from1to2.addAll(from2to1);
        from1to2.sort((m1, m2) -> m1.getTimestamp().compareTo(m2.getTimestamp()));

        return from1to2.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    private MessageResponse mapToResponse(Message message) {
        MessageResponse response = new MessageResponse();
        response.setId(message.getId());
        response.setSenderUsername(message.getSender().getUsername());
        response.setReceiverUsername(message.getReceiver().getUsername());
        response.setEncryptedContent(message.getEncryptedContent());
        response.setTimestamp(message.getTimestamp());
        response.setRead(message.isRead());
        return response;
    }

    @Transactional
    public void markMessagesAsRead(String currentUsername, String senderUsername) {
        User currentUser = userService.findByUsername(currentUsername);
        User sender = userService.findByUsername(senderUsername);

        List<Message> unreadMessages = messageRepository.findBySenderAndReceiverAndReadFalse(sender, currentUser);
        for (Message message : unreadMessages) {
            message.setRead(true);
        }
        messageRepository.saveAll(unreadMessages);
    }
}