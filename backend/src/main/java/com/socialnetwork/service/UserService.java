package com.socialnetwork.service;

import com.socialnetwork.dto.RegisterRequest;
import com.socialnetwork.model.ChatKey;
import com.socialnetwork.model.User;
import com.socialnetwork.repository.ChatKeyRepository;
import com.socialnetwork.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class UserService {
    private final UserRepository userRepository;
    private final ChatKeyRepository chatKeyRepository;
    private final PasswordEncoder passwordEncoder;

    public User register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new RuntimeException("Username already exists");
        }
        if (userRepository.existsByPhone(request.getPhone())) {
            throw new RuntimeException("Phone already exists");
        }

        User user = new User();
        user.setUsername(request.getUsername());
        user.setPhone(request.getPhone());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setEmail(request.getEmail()); // может быть null

        return userRepository.save(user);
    }

    public User findByUsername(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    public User findByPhone(String phone) {
        return userRepository.findByPhone(phone)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    public User findByLogin(String login) {
        // сначала ищем по username, потом по phone
        Optional<User> byUsername = userRepository.findByUsername(login);
        if (byUsername.isPresent()) return byUsername.get();
        return userRepository.findByPhone(login)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public List<User> searchUsers(String query) {
        if (query == null || query.trim().isEmpty()) {
            return List.of(); // пустой поиск
        }
        // ищем по username или phone (точное совпадение)
        Optional<User> byUsername = userRepository.findByUsername(query);
        if (byUsername.isPresent()) return List.of(byUsername.get());

        Optional<User> byPhone = userRepository.findByPhone(query);
        if (byPhone.isPresent()) return List.of(byPhone.get());

        return List.of();
    }

    // Пользователи, с которыми есть чаты
    public List<User> getUsersWithChats(String currentUsername) {
        User current = findByUsername(currentUsername);
        List<ChatKey> keys = chatKeyRepository.findAllByUser1OrUser2(current, current);
        Set<User> usersWithChats = new HashSet<>();
        for (ChatKey key : keys) {
            if (!key.getUser1().equals(current)) {
                usersWithChats.add(key.getUser1());
            }
            if (!key.getUser2().equals(current)) {
                usersWithChats.add(key.getUser2());
            }
        }
        return new ArrayList<>(usersWithChats);
    }
}