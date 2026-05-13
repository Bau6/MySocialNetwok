package com.socialnetwork.controller;

import com.socialnetwork.dto.response.FileUploadResponse;
import com.socialnetwork.service.FileStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.nio.file.Path;
import java.nio.file.Paths;

@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
public class FileController {

    private final FileStorageService fileStorageService;

    @PostMapping("/upload")
    public ResponseEntity<FileUploadResponse> uploadFile(
            Authentication authentication,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "type", defaultValue = "message") String type) {
        String username = authentication.getName();
        return ResponseEntity.ok(fileStorageService.uploadFile(file, username, type));
    }

    @PostMapping("/upload/voice")
    public ResponseEntity<FileUploadResponse> uploadVoiceMessage(
            Authentication authentication,
            @RequestParam("file") MultipartFile file) {
        String username = authentication.getName();
        return ResponseEntity.ok(fileStorageService.uploadFile(file, username, "voice"));
    }

    @PostMapping("/upload/avatar")
    public ResponseEntity<FileUploadResponse> uploadAvatar(
            Authentication authentication,
            @RequestParam("file") MultipartFile file) {
        String username = authentication.getName();
        return ResponseEntity.ok(fileStorageService.uploadFile(file, username, "avatar"));
    }

    @GetMapping("/{subDir}/{filename}")
    public ResponseEntity<Resource> downloadFile(
            @PathVariable String subDir,
            @PathVariable String filename) {
        try {
            Path filePath = Paths.get("./uploads").resolve(subDir).resolve(filename).normalize();
            Resource resource = new UrlResource(filePath.toUri());

            if (resource.exists()) {
                String contentType = determineContentType(filename);
                return ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(contentType))
                        .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + resource.getFilename() + "\"")
                        .body(resource);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    private String determineContentType(String filename) {
        if (filename.endsWith(".mp4")) return "video/mp4";
        if (filename.endsWith(".mp3")) return "audio/mpeg";
        if (filename.endsWith(".ogg")) return "audio/ogg";
        if (filename.endsWith(".jpg") || filename.endsWith(".jpeg")) return "image/jpeg";
        if (filename.endsWith(".png")) return "image/png";
        if (filename.endsWith(".gif")) return "image/gif";
        return "application/octet-stream";
    }
}