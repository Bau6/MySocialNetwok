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

    // Создание ключа для чата (при создании чата, например, когда пользователь нажимает "Написать")
    @Transactional
    public String createChatKey(String currentUsername, String otherUsername) {
        User user1 = userService.findByUsername(currentUsername);
        User user2 = userService.findByUsername(otherUsername);
        // проверяем, существует ли уже ключ
        return chatKeyRepository.findByUser1AndUser2(user1, user2)
                .or(() -> chatKeyRepository.findByUser1AndUser2(user2, user1))
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
        return chatKeyRepository.findByUser1AndUser2(user1, user2)
                .or(() -> chatKeyRepository.findByUser1AndUser2(user2, user1))
                .map(ChatKey::getKeyValue)
                .orElse(null);
    }

    @Transactional
    public MessageResponse sendMessage(String senderUsername, MessageRequest request) {
        User sender = userService.findByUsername(senderUsername);
        User receiver = userService.findByUsername(request.getReceiverUsername());

        // ключ должен существовать (должен быть создан заранее)
        ChatKey chatKey = chatKeyRepository.findByUser1AndUser2(sender, receiver)
                .or(() -> chatKeyRepository.findByUser1AndUser2(receiver, sender))
                .orElseThrow(() -> new RuntimeException("Chat key not found. Please create chat first."));

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
}