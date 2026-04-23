package com.socialnetwork.utils;

import java.util.regex.Pattern;

public class DataNormalizer {

    public static String normalizePhone(String phone) {
        if (phone == null || phone.trim().isEmpty()) {
            return null;
        }

        // Удаляем все символы, кроме цифр и плюса
        String cleaned = phone.replaceAll("[^\\d+]", "");

        // Если есть + в начале, оставляем его
        boolean hasPlus = cleaned.startsWith("+");

        // Удаляем все не цифры
        String digits = cleaned.replaceAll("[^\\d]", "");

        // Если номер начинается с 8, заменяем на +7
        if (digits.length() == 11 && digits.startsWith("8")) {
            digits = "7" + digits.substring(1);
        }

        // Если номер из 10 цифр (без кода страны), добавляем +7
        if (digits.length() == 10) {
            digits = "7" + digits;
        }

        // Если номер из 11 цифр и начинается с 7, добавляем +
        if (digits.length() == 11 && digits.startsWith("7")) {
            return "+" + digits;
        }

        // Если уже есть + в начале
        if (hasPlus && digits.length() == 11) {
            return "+" + digits;
        }

        // Возвращаем очищенный номер с +
        if (digits.length() >= 10) {
            return "+" + digits;
        }

        return phone; // если не удалось нормализовать, возвращаем как есть
    }

    public static String normalizeEmail(String email) {
        if (email == null || email.trim().isEmpty()) {
            return null;
        }

        // Приводим к нижнему регистру и удаляем пробелы
        String normalized = email.trim().toLowerCase();

        // Валидация email
        String emailRegex = "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$";
        if (!Pattern.matches(emailRegex, normalized)) {
            throw new IllegalArgumentException("Неверный формат email");
        }

        return normalized;
    }

    public static String normalizeUsername(String username) {
        if (username == null || username.trim().isEmpty()) {
            return null;
        }

        // Приводим к нижнему регистру, удаляем пробелы и специальные символы
        String normalized = username.trim().toLowerCase()
                .replaceAll("[^a-zA-Z0-9._]", "");

        if (normalized.length() < 3) {
            throw new IllegalArgumentException("Имя пользователя должно содержать минимум 3 символа");
        }

        return normalized;
    }
}