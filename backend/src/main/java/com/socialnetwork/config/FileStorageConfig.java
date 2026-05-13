package com.socialnetwork.config;

import jakarta.annotation.PostConstruct;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import java.nio.file.Path;
import java.nio.file.Paths;

@Configuration
@ConfigurationProperties(prefix = "file")
@Getter
@Setter
public class FileStorageConfig {

    private String uploadDir = "./uploads";
    private long maxFileSize = 52428800; // 50MB
    private String allowedExtensions = "jpg,jpeg,png,gif,mp4,mp3,ogg";

    public Path getUploadPath() {
        return Paths.get(uploadDir).toAbsolutePath().normalize();
    }

    @PostConstruct
    public void init() {
        try {
            java.nio.file.Files.createDirectories(getUploadPath());
            java.nio.file.Files.createDirectories(getUploadPath().resolve("avatars"));
            java.nio.file.Files.createDirectories(getUploadPath().resolve("messages"));
            java.nio.file.Files.createDirectories(getUploadPath().resolve("voice"));
        } catch (Exception e) {
            throw new RuntimeException("Could not create upload directories", e);
        }
    }
}