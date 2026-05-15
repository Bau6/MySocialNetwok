package com.socialnetwork.controller;

import com.socialnetwork.dto.request.MessageRequest;
import com.socialnetwork.dto.response.MessageResponse;
import com.socialnetwork.service.MessageService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

@Controller
@RequiredArgsConstructor
public class WebSocketMessageController {

    private final SimpMessagingTemplate messagingTemplate;
    private final MessageService messageService;

    @MessageMapping("/chat.send")
    public void sendMessage(@Payload MessageRequest messageRequest) {
        // Сохраняем сообщение в БД через существующий сервис
        MessageResponse saved = messageService.sendEncryptedMessage(
                messageRequest.getSenderUsername(),
                messageRequest
        );
        // Отправляем получателю в его персональную очередь
        messagingTemplate.convertAndSendToUser(
                messageRequest.getReceiverUsername(),
                "/queue/messages",
                saved
        );
        // Опционально: отправить также отправителю для подтверждения
        messagingTemplate.convertAndSendToUser(
                messageRequest.getSenderUsername(),
                "/queue/messages",
                saved
        );
    }
}