package com.socialnetwork.controller;

import com.socialnetwork.dto.LoginRequest;
import com.socialnetwork.dto.RegisterRequest;
import com.socialnetwork.service.AuthService;
import com.socialnetwork.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.annotation.*;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AuthController {
    private final AuthService authService;
    private final UserService userService;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        try {
            String token = authService.login(request);
            Map<String, String> response = new HashMap<>();
            response.put("token", token);
            response.put("message", "Вход выполнен успешно");
            return ResponseEntity.ok(response);
        } catch (BadCredentialsException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Неверный пароль");
            error.put("details", "Проверьте правильность введённого пароля");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
        } catch (UsernameNotFoundException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Пользователь не найден");
            error.put("details", "Пользователь с таким логином или номером телефона не зарегистрирован");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Ошибка входа");
            error.put("details", "Попробуйте позже или обратитесь в поддержку");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        try {
            userService.register(request);
            Map<String, String> response = new HashMap<>();
            response.put("message", "Регистрация прошла успешно");
            response.put("details", "Теперь вы можете войти в систему");
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            String message = e.getMessage();

            if (message.contains("Username already exists")) {
                error.put("error", "Имя пользователя уже занято");
                error.put("details", "Пожалуйста, выберите другое имя пользователя");
            } else if (message.contains("Phone already exists")) {
                error.put("error", "Номер телефона уже зарегистрирован");
                error.put("details", "Пользователь с таким номером телефона уже существует");
            } else if (message.contains("Email already exists")) {
                error.put("error", "Email уже зарегистрирован");
                error.put("details", "Пользователь с таким email уже существует");
            } else if (message.contains("Username must be at least 3 characters")) {
                error.put("error", "Имя пользователя слишком короткое");
                error.put("details", "Имя пользователя должно содержать минимум 3 символа");
            } else if (message.contains("Password must be at least 6 characters")) {
                error.put("error", "Пароль слишком короткий");
                error.put("details", "Пароль должен содержать минимум 6 символов");
            } else {
                error.put("error", "Ошибка регистрации");
                error.put("details", message);
            }
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Внутренняя ошибка сервера");
            error.put("details", "Попробуйте позже");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }
}