package com.socialnetwork.service;

import com.socialnetwork.dto.request.LoginRequest;
import com.socialnetwork.dto.request.RefreshTokenRequest;
import com.socialnetwork.dto.request.RegisterRequest;
import com.socialnetwork.dto.response.AuthResponse;
import com.socialnetwork.dto.response.UserResponse;
import com.socialnetwork.exception.BadRequestException;
import com.socialnetwork.model.RefreshToken;
import com.socialnetwork.model.User;
import com.socialnetwork.repository.RefreshTokenRepository;
import com.socialnetwork.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;
    private final UserService userService;
    private final RefreshTokenRepository refreshTokenRepository;

    public AuthResponse login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getLogin(), request.getPassword())
        );

        String username = authentication.getName();
        User user = userService.findByUsername(username);
        userService.updateLastSeen(username);

        String accessToken = tokenProvider.generateAccessToken(authentication);
        String refreshToken = tokenProvider.generateRefreshToken(username);
        saveRefreshToken(user, refreshToken);

        return new AuthResponse(accessToken, refreshToken, new UserResponse(user));
    }

    @Transactional
    public AuthResponse refreshToken(RefreshTokenRequest request) {
        String refreshToken = request.getRefreshToken();
        if (!tokenProvider.validateToken(refreshToken)) {
            throw new BadRequestException("Invalid refresh token");
        }

        String username = tokenProvider.getUsernameFromToken(refreshToken);
        User user = userService.findByUsername(username);

        RefreshToken savedToken = refreshTokenRepository.findByUser(user)
                .orElseThrow(() -> new BadRequestException("Refresh token not found"));

        if (savedToken.isRevoked() || savedToken.getExpiryDate().isBefore(LocalDateTime.now())) {
            throw new BadRequestException("Refresh token expired or revoked");
        }

        Authentication authentication = new UsernamePasswordAuthenticationToken(username, null);
        String newAccessToken = tokenProvider.generateAccessToken(authentication);
        String newRefreshToken = tokenProvider.generateRefreshToken(username);

        savedToken.setToken(newRefreshToken);
        savedToken.setExpiryDate(LocalDateTime.now().plusDays(7));
        refreshTokenRepository.save(savedToken);

        return new AuthResponse(newAccessToken, newRefreshToken, new UserResponse(user));
    }

    @Transactional
    public void logout(String username) {
        User user = userService.findByUsername(username);
        refreshTokenRepository.deleteByUser(user);
        userService.setUserOffline(username);
    }

    private void saveRefreshToken(User user, String token) {
        RefreshToken refreshToken = refreshTokenRepository.findByUser(user)
                .orElse(new RefreshToken());
        refreshToken.setUser(user);
        refreshToken.setToken(token);
        refreshToken.setExpiryDate(LocalDateTime.now().plusDays(7));
        refreshToken.setRevoked(false);
        refreshTokenRepository.save(refreshToken);
    }

    public void register(RegisterRequest request) {
        userService.register(request);
    }
}