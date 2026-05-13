package com.socialnetwork.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "one_time_pre_keys")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class OneTimePreKey {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    private Integer keyId;

    @Column(columnDefinition = "TEXT")
    private String publicKey;

    private boolean used = false;

    private LocalDateTime createdAt;
}