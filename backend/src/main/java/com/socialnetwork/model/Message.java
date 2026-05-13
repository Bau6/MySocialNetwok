package com.socialnetwork.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "messages")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Message {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "sender_id", nullable = false)
    private User sender;

    @ManyToOne
    @JoinColumn(name = "receiver_id", nullable = false)
    private User receiver;

    // Для получателя (зашифровано публичным ключом получателя)
    @Column(nullable = false, columnDefinition = "TEXT")
    private String encryptedContent;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String encryptedSessionKey;

    @Column(nullable = false)
    private String iv;

    // Для отправителя (зашифровано публичным ключом отправителя)
    @Column(nullable = false, columnDefinition = "TEXT")
    private String encryptedContentForSender;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String encryptedSessionKeyForSender;

    @Column(nullable = false)
    private String ivForSender;

    @Column(nullable = false)
    private LocalDateTime timestamp;

    private boolean read;

    @Enumerated(EnumType.STRING)
    private MessageType type = MessageType.TEXT;

    private String fileUrl;
    private String fileName;
    private Long fileSize;

    private Long replyToId;
}