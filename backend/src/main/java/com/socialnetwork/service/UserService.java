package com.socialnetwork.service;

import com.socialnetwork.dto.request.RegisterRequest;
import com.socialnetwork.dto.response.UserResponse;
import com.socialnetwork.exception.BadRequestException;
import com.socialnetwork.exception.ResourceNotFoundException;
import com.socialnetwork.model.User;
import com.socialnetwork.repository.MessageRepository;
import com.socialnetwork.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final MessageRepository messageRepository;

    @Transactional
    public void register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername()))
            throw new BadRequestException("Username already taken");
        if (userRepository.existsByPhone(request.getPhone()))
            throw new BadRequestException("Phone already registered");
        if (request.getEmail() != null && userRepository.existsByEmail(request.getEmail()))
            throw new BadRequestException("Email already registered");

        User user = new User();
        user.setUsername(request.getUsername());
        user.setPhone(request.getPhone());
        user.setEmail(request.getEmail());
        user.setFullName(request.getFullName());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setPublicKey(request.getPublicKey());
        user.setEncryptedPrivateKey(request.getEncryptedPrivateKey());
        user.setCreatedAt(LocalDateTime.now());
        user.setOnline(false);
        user.getRoles().add("ROLE_USER");

        userRepository.save(user);
    }

    public User findByUsername(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));
    }

    public User findById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
    }

    public List<UserResponse> searchUsers(String query) {
        if (query == null || query.trim().isEmpty()) return Collections.emptyList();
        return userRepository.searchUsers(query.trim().toLowerCase())
                .stream().map(UserResponse::new).collect(Collectors.toList());
    }

    @Transactional
    public void updateLastSeen(String username) {
        try {
            User user = findByUsername(username);
            user.setLastSeen(LocalDateTime.now());
            user.setOnline(true);
            userRepository.save(user);
        } catch (ResourceNotFoundException ignored) {}
    }

    @Transactional
    public void setUserOffline(String username) {
        try {
            User user = findByUsername(username);
            user.setOnline(false);
            user.setLastSeen(LocalDateTime.now());
            userRepository.save(user);
        } catch (ResourceNotFoundException ignored) {}
    }

    public boolean isUserOnline(String username) {
        try {
            User user = findByUsername(username);
            if (user.getLastSeen() != null) {
                return user.isOnline() || user.getLastSeen().isAfter(LocalDateTime.now().minusMinutes(5));
            }
            return user.isOnline();
        } catch (ResourceNotFoundException e) {
            return false;
        }
    }

    public String getPublicKey(String username) {
        User user = findByUsername(username);
        if (user.getPublicKey() == null) {
            throw new BadRequestException("User has no public key");
        }
        return user.getPublicKey();
    }

    public List<UserResponse> getAllUsersWithPublicKeys(String currentUsername) {
        return userRepository.findAll().stream()
                .filter(u -> !u.getUsername().equals(currentUsername))
                .map(UserResponse::new)
                .collect(Collectors.toList());
    }

    public List<UserResponse> getChatUsers(String currentUsername) {
        User current = findByUsername(currentUsername);
        List<com.socialnetwork.model.Message> all = messageRepository.findAllBySenderOrReceiver(current);
        Set<User> users = new HashSet<>();
        for (com.socialnetwork.model.Message m : all) {
            if (!m.getSender().equals(current)) users.add(m.getSender());
            if (!m.getReceiver().equals(current)) users.add(m.getReceiver());
        }
        return users.stream().map(UserResponse::new).collect(Collectors.toList());
    }
}