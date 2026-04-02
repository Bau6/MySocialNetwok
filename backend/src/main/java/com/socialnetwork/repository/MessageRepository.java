package com.socialnetwork.repository;

import com.socialnetwork.model.Message;
import com.socialnetwork.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface MessageRepository extends JpaRepository<Message, Long> {
    List<Message> findBySenderAndReceiverOrderByTimestampAsc(User sender, User receiver);
    List<Message> findBySenderAndReceiverOrderByTimestampDesc(User sender, User receiver);
}