package com.socialnetwork.service;

import com.socialnetwork.model.User;
import com.socialnetwork.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class UserStatusService {

    private final UserRepository userRepository;

    @Scheduled(fixedRate = 60000)
    @Transactional
    public void updateUserStatuses() {
        LocalDateTime fiveMinutesAgo = LocalDateTime.now().minusMinutes(5);
        List<User> staleOnlineUsers = userRepository.findAll().stream()
                .filter(user -> user.isOnline() &&
                        (user.getLastSeen() == null || user.getLastSeen().isBefore(fiveMinutesAgo)))
                .toList();
        for (User user : staleOnlineUsers) {
            user.setOnline(false);
            userRepository.save(user);
        }
    }
}