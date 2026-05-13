package com.socialnetwork.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class FileUploadResponse {
    private String fileUrl;
    private String fileName;
    private Long fileSize;
    private String fileType;
}