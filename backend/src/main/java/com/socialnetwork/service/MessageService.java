package com.socialnetwork.service;

import com.socialnetwork.dto.request.MessageRequest;
import com.socialnetwork.dto.response.ChatPreviewResponse;
import com.socialnetwork.dto.response.MessageResponse;
import com.socialnetwork.model.Message;
import com.socialnetwork.model.User;
import com.socialnetwork.repository.MessageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MessageService {

    private final MessageRepository messageRepository;
    private final UserService userService;

    @Transactional
    public MessageResponse sendEncryptedMessage(String senderUsername, MessageRequest request) {
        User sender = userService.findByUsername(senderUsername);
        User receiver = userService.findByUsername(request.getReceiverUsername());

        Message message = new Message();
        message.setSender(sender);
        message.setReceiver(receiver);

        // Для получателя
        message.setEncryptedContent(request.getEncryptedContent());
        message.setEncryptedSessionKey(request.getEncryptedSessionKey());
        message.setIv(request.getIv());

        // Для отправителя (если не заданы, дублируем получательские – но по логике они должны быть)
        if (request.getEncryptedContentForSender() != null) {
            message.setEncryptedContentForSender(request.getEncryptedContentForSender());
            message.setEncryptedSessionKeyForSender(request.getEncryptedSessionKeyForSender());
            message.setIvForSender(request.getIvForSender());
        } else {
            // fallback – сохраняем те же данные (отправитель не сможет расшифровать, но лучше так, чем null)
            message.setEncryptedContentForSender(request.getEncryptedContent());
            message.setEncryptedSessionKeyForSender(request.getEncryptedSessionKey());
            message.setIvForSender(request.getIv());
        }

        message.setTimestamp(LocalDateTime.now());
        message.setRead(false);
        message.setType(request.getType());
        message.setFileUrl(request.getFileUrl());
        message.setFileName(request.getFileName());
        message.setFileSize(request.getFileSize());
        message.setReplyToId(request.getReplyToId());

        Message saved = messageRepository.save(message);
        return mapToResponse(saved);
    }

    public List<MessageResponse> getConversation(String username1, String username2) {
        User user1 = userService.findByUsername(username1);
        User user2 = userService.findByUsername(username2);
        List<Message> messages = messageRepository.findAllConversationBetweenUsers(user1, user2);
        messages.sort(Comparator.comparing(Message::getTimestamp));
        return messages.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    public Page<MessageResponse> getConversationPage(String currentUsername, String otherUsername, Pageable pageable) {
        User current = userService.findByUsername(currentUsername);
        User other = userService.findByUsername(otherUsername);
        Page<Message> messagesPage = messageRepository.findConversationBetweenUsers(current, other, pageable);
        return messagesPage.map(this::mapToResponse);
    }

    @Transactional
    public void markMessagesAsRead(String currentUsername, String senderUsername) {
        User current = userService.findByUsername(currentUsername);
        User sender = userService.findByUsername(senderUsername);
        List<Message> unread = messageRepository.findBySenderAndReceiverAndReadFalse(sender, current);
        unread.forEach(msg -> msg.setRead(true));
        messageRepository.saveAll(unread);
    }

    public long getUnreadCount(String username) {
        User user = userService.findByUsername(username);
        return messageRepository.countUnreadForUser(user);
    }

    public List<ChatPreviewResponse> getChatPreviews(String currentUsername) {
        User current = userService.findByUsername(currentUsername);
        List<Message> allMessages = messageRepository.findAllBySenderOrReceiver(current);

        Map<User, List<Message>> messagesByUser = new HashMap<>();
        for (Message msg : allMessages) {
            User other = msg.getSender().equals(current) ? msg.getReceiver() : msg.getSender();
            messagesByUser.computeIfAbsent(other, k -> new ArrayList<>()).add(msg);
        }

        List<ChatPreviewResponse> result = new ArrayList<>();
        for (Map.Entry<User, List<Message>> entry : messagesByUser.entrySet()) {
            User other = entry.getKey();
            List<Message> msgs = entry.getValue();
            msgs.sort(Comparator.comparing(Message::getTimestamp));
            Message lastMsg = msgs.get(msgs.size() - 1);

            long unreadCount = msgs.stream()
                    .filter(m -> m.getReceiver().equals(current) && !m.isRead())
                    .count();

            ChatPreviewResponse response = new ChatPreviewResponse();
            response.setUsername(other.getUsername());
            response.setFullName(other.getFullName());
            response.setAvatarUrl(other.getAvatarUrl());
            response.setOnline(other.isOnline());
            response.setLastSeen(other.getLastSeen());
            // Для предпросмотра нужно выбрать шифротекст, соответствующий текущему пользователю.
            // Если текущий пользователь – отправитель, то берём поля forSender, иначе – обычные.
            if (lastMsg.getSender().equals(current)) {
                response.setLastMessageEncrypted(lastMsg.getEncryptedContentForSender());
                response.setLastMessageEncryptedSessionKey(lastMsg.getEncryptedSessionKeyForSender());
                response.setLastMessageIv(lastMsg.getIvForSender());
            } else {
                response.setLastMessageEncrypted(lastMsg.getEncryptedContent());
                response.setLastMessageEncryptedSessionKey(lastMsg.getEncryptedSessionKey());
                response.setLastMessageIv(lastMsg.getIv());
            }
            response.setLastMessageTime(lastMsg.getTimestamp());
            response.setUnreadCount(unreadCount);
            result.add(response);
        }
        result.sort((a, b) -> b.getLastMessageTime().compareTo(a.getLastMessageTime()));
        return result;
    }

    private MessageResponse mapToResponse(Message message) {
        MessageResponse response = new MessageResponse();
        response.setId(message.getId());
        response.setSenderUsername(message.getSender().getUsername());
        response.setReceiverUsername(message.getReceiver().getUsername());
        // Всегда отдаём оба набора полей – клиент выберет нужный
        response.setEncryptedContent(message.getEncryptedContent());
        response.setEncryptedSessionKey(message.getEncryptedSessionKey());
        response.setIv(message.getIv());
        response.setEncryptedContentForSender(message.getEncryptedContentForSender());
        response.setEncryptedSessionKeyForSender(message.getEncryptedSessionKeyForSender());
        response.setIvForSender(message.getIvForSender());
        response.setTimestamp(message.getTimestamp());
        response.setRead(message.isRead());
        response.setType(message.getType());
        response.setFileUrl(message.getFileUrl());
        response.setFileName(message.getFileName());
        response.setFileSize(message.getFileSize());
        response.setReplyToId(message.getReplyToId());
        return response;
    }
}