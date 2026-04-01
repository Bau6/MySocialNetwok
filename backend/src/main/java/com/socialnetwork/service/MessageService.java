package com.socialnetwork.service;

import com.socialnetwork.dto.MessageRequest;
import com.socialnetwork.dto.MessageResponse;
import com.socialnetwork.model.Message;
import com.socialnetwork.model.User;
import com.socialnetwork.repository.MessageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MessageService {
    private final MessageRepository messageRepository;
    private final UserService userService;

    public MessageResponse sendMessage(String senderUsername, MessageRequest request) {
        User sender = userService.findByUsername(senderUsername);
        User receiver = userService.findByUsername(request.getReceiverUsername());

        Message message = new Message();
        message.setSender(sender);
        message.setReceiver(receiver);
        message.setEncryptedContent(request.getEncryptedContent());
        message.setTimestamp(LocalDateTime.now());
        message.setRead(false);

        Message saved = messageRepository.save(message);
        return mapToResponse(saved);
    }

    public List<MessageResponse> getConversation(String username1, String username2) {
        User user1 = userService.findByUsername(username1);
        User user2 = userService.findByUsername(username2);

        List<Message> messages = messageRepository.findBySenderAndReceiverOrderByTimestampAsc(user1, user2);
        List<Message> reverseMessages = messageRepository.findBySenderAndReceiverOrderByTimestampAsc(user2, user1);

        messages.addAll(reverseMessages);
        messages.sort((m1, m2) -> m1.getTimestamp().compareTo(m2.getTimestamp()));

        return messages.stream()
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