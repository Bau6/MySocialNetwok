package com.socialnetwork.service;

import com.socialnetwork.config.FileStorageConfig;
import com.socialnetwork.dto.response.FileUploadResponse;
import com.socialnetwork.exception.BadRequestException;
import com.socialnetwork.model.FileAttachment;
import com.socialnetwork.model.User;
import com.socialnetwork.repository.FileAttachmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.util.StringUtils;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Arrays;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FileStorageService {

    private final FileStorageConfig fileStorageConfig;
    private final FileAttachmentRepository fileAttachmentRepository;
    private final UserService userService;

    public FileUploadResponse uploadFile(MultipartFile file, String username, String type) {
        validateFile(file);

        try {
            String originalFilename = StringUtils.cleanPath(file.getOriginalFilename());
            String fileExtension = getFileExtension(originalFilename);
            String generatedFileName = generateFileName(username, fileExtension);
            String subDir = determineSubDirectory(type, fileExtension);
            Path targetLocation = fileStorageConfig.getUploadPath().resolve(subDir).resolve(generatedFileName);

            Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);

            String fileUrl = "/api/files/" + subDir + "/" + generatedFileName;
            User user = userService.findByUsername(username);

            FileAttachment attachment = new FileAttachment();
            attachment.setFileName(generatedFileName);
            attachment.setFileUrl(fileUrl);
            attachment.setFileType(file.getContentType());
            attachment.setFileSize(file.getSize());
            attachment.setUploadedBy(user);
            fileAttachmentRepository.save(attachment);

            return new FileUploadResponse(fileUrl, generatedFileName, file.getSize(), file.getContentType());

        } catch (IOException ex) {
            throw new BadRequestException("Could not store file: " + ex.getMessage());
        }
    }

    private void validateFile(MultipartFile file) {
        if (file.isEmpty()) throw new BadRequestException("File is empty");
        if (file.getSize() > fileStorageConfig.getMaxFileSize())
            throw new BadRequestException("File size exceeds maximum allowed size");

        String extension = getFileExtension(StringUtils.cleanPath(file.getOriginalFilename()));
        Set<String> allowedExtensions = Arrays.stream(fileStorageConfig.getAllowedExtensions().split(","))
                .collect(Collectors.toSet());
        if (!allowedExtensions.contains(extension.toLowerCase()))
            throw new BadRequestException("File extension not allowed. Allowed: " + allowedExtensions);
    }

    private String getFileExtension(String filename) {
        int lastDot = filename.lastIndexOf(".");
        return (lastDot == -1) ? "" : filename.substring(lastDot + 1);
    }

    private String generateFileName(String username, String extension) {
        return username + "_" + UUID.randomUUID() + "." + extension;
    }

    private String determineSubDirectory(String type, String extension) {
        if ("avatar".equals(type)) return "avatars";
        if ("voice".equals(type) || "audio".equals(type)) return "voice";
        return "messages";
    }

    public void deleteFile(String fileUrl) {
        try {
            Path filePath = fileStorageConfig.getUploadPath().resolve(fileUrl.substring("/api/files/".length()));
            Files.deleteIfExists(filePath);
        } catch (IOException ex) {
            System.err.println("Could not delete file: " + ex.getMessage());
        }
    }
}