package com.socialnetwork.repository;

import com.socialnetwork.model.FileAttachment;
import com.socialnetwork.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface FileAttachmentRepository extends JpaRepository<FileAttachment, Long> {
    List<FileAttachment> findByUploadedBy(User user);
    List<FileAttachment> findByMessageId(Long messageId);
}