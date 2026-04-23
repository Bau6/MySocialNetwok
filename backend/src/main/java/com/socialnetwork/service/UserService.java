package com.socialnetwork.service;

import com.socialnetwork.dto.RegisterRequest;
import com.socialnetwork.model.ChatKey;
import com.socialnetwork.model.User;
import com.socialnetwork.repository.ChatKeyRepository;
import com.socialnetwork.repository.UserRepository;
import com.socialnetwork.utils.DataNormalizer;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {
    private final UserRepository userRepository;
    private final ChatKeyRepository chatKeyRepository;
    private final PasswordEncoder passwordEncoder;

    public User register(RegisterRequest request) {
        // Нормализация данных
        String normalizedUsername = DataNormalizer.normalizeUsername(request.getUsername());
        String normalizedPhone = DataNormalizer.normalizePhone(request.getPhone());
        String normalizedEmail = request.getEmail() != null ? DataNormalizer.normalizeEmail(request.getEmail()) : null;

        // Валидация
        if (normalizedUsername == null || normalizedUsername.trim().isEmpty()) {
            throw new RuntimeException("Имя пользователя не может быть пустым");
        }
        if (normalizedPhone == null) {
            throw new RuntimeException("Номер телефона не может быть пустым");
        }
        if (request.getPassword() == null || request.getPassword().isEmpty()) {
            throw new RuntimeException("Пароль не может быть пустым");
        }

        if (normalizedUsername.length() < 3) {
            throw new RuntimeException("Имя пользователя должно содержать минимум 3 символа");
        }
        if (request.getPassword().length() < 6) {
            throw new RuntimeException("Пароль должен содержать минимум 6 символов");
        }

        if (userRepository.existsByUsername(normalizedUsername)) {
            throw new RuntimeException("Username already exists");
        }
        if (userRepository.existsByPhone(normalizedPhone)) {
            throw new RuntimeException("Phone already exists");
        }
        if (normalizedEmail != null && userRepository.existsByEmail(normalizedEmail)) {
            throw new RuntimeException("Email already exists");
        }

        User user = new User();
        user.setUsername(normalizedUsername);
        user.setPhone(normalizedPhone);
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setEmail(normalizedEmail);
        user.setLastSeen(LocalDateTime.now());
        user.setOnline(true);

        return userRepository.save(user);
    }

    public User findByUsername(String username) {
        String normalizedUsername = DataNormalizer.normalizeUsername(username);
        return userRepository.findByUsername(normalizedUsername)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + username));
    }

    public User findByPhone(String phone) {
        String normalizedPhone = DataNormalizer.normalizePhone(phone);
        return userRepository.findByPhone(normalizedPhone)
                .orElseThrow(() -> new IllegalArgumentException("User not found with phone: " + phone));
    }

    public User findByLogin(String login) {
        String normalizedUsername = DataNormalizer.normalizeUsername(login);
        Optional<User> byUsername = userRepository.findByUsername(normalizedUsername);
        if (byUsername.isPresent()) return byUsername.get();

        String normalizedPhone = DataNormalizer.normalizePhone(login);
        return userRepository.findByPhone(normalizedPhone)
                .orElseThrow(() -> new IllegalArgumentException("User not found with login: " + login));
    }

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    // ИСПРАВЛЕННЫЙ МЕТОД - поиск по частичному совпадению
    public List<User> searchUsers(String query) {
        if (query == null || query.trim().isEmpty()) {
            return new ArrayList<>();
        }

        String normalizedQuery = query.trim().toLowerCase();
        String phoneQuery = DataNormalizer.normalizePhone(query);

        // Поиск по частичному совпадению во всех полях
        List<User> results = userRepository.searchUsers(normalizedQuery, phoneQuery, normalizedQuery);

        // Удаляем дубликаты (если пользователь найден по нескольким критериям)
        return results.stream().distinct().collect(Collectors.toList());
    }

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

    public boolean isUserOnline(String username) {
        try {
            User user = findByUsername(username);
            if (user.getLastSeen() != null) {
                return user.getLastSeen().isAfter(LocalDateTime.now().minusMinutes(5));
            }
            return user.isOnline();
        } catch (IllegalArgumentException e) {
            return false;
        }
    }

    public void updateLastSeen(String username) {
        try {
            User user = findByUsername(username);
            user.setLastSeen(LocalDateTime.now());
            user.setOnline(true);
            userRepository.save(user);
        } catch (IllegalArgumentException e) {
            System.err.println("Failed to update last seen for user: " + username);
        }
    }

    public void setUserOffline(String username) {
        try {
            User user = findByUsername(username);
            user.setOnline(false);
            user.setLastSeen(LocalDateTime.now());
            userRepository.save(user);
        } catch (IllegalArgumentException e) {
            System.err.println("Failed to set user offline: " + username);
        }
    }

    public Optional<User> findUserByUsername(String username) {
        String normalizedUsername = DataNormalizer.normalizeUsername(username);
        return userRepository.findByUsername(normalizedUsername);
    }
}