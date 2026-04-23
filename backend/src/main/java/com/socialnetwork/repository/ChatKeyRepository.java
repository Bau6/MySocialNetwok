package com.socialnetwork.repository;

import com.socialnetwork.model.ChatKey;
import com.socialnetwork.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface ChatKeyRepository extends JpaRepository<ChatKey, Long> {

    List<ChatKey> findAllByUser1OrUser2(User user1, User user2);

    Optional<ChatKey> findByUser1AndUser2(User user1, User user2);

    @Query("SELECT ck FROM ChatKey ck WHERE (ck.user1 = :user1 AND ck.user2 = :user2) OR (ck.user1 = :user2 AND ck.user2 = :user1)")
    Optional<ChatKey> findChatKeyBetweenUsers(@Param("user1") User user1, @Param("user2") User user2);

    // ДОБАВЬТЕ ЭТОТ МЕТОД
    Optional<ChatKey> findByKeyValue(String keyValue);
}