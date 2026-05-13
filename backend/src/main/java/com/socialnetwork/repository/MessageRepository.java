package com.socialnetwork.repository;

import com.socialnetwork.model.Message;
import com.socialnetwork.model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface MessageRepository extends JpaRepository<Message, Long> {

    List<Message> findBySenderAndReceiverAndReadFalse(User sender, User receiver);

    @Query("SELECT m FROM Message m WHERE (m.sender = :u1 AND m.receiver = :u2) OR (m.sender = :u2 AND m.receiver = :u1)")
    List<Message> findAllConversationBetweenUsers(@Param("u1") User u1, @Param("u2") User u2);

    @Query("SELECT m FROM Message m WHERE m.sender = :user OR m.receiver = :user")
    List<Message> findAllBySenderOrReceiver(@Param("user") User user);

    @Query("SELECT COUNT(m) FROM Message m WHERE m.receiver = :user AND m.read = false")
    long countUnreadForUser(@Param("user") User user);

    @Query("SELECT m FROM Message m WHERE (m.sender = :u1 AND m.receiver = :u2) OR (m.sender = :u2 AND m.receiver = :u1) ORDER BY m.timestamp DESC")
    Page<Message> findConversationBetweenUsers(@Param("u1") User u1, @Param("u2") User u2, Pageable pageable);
}