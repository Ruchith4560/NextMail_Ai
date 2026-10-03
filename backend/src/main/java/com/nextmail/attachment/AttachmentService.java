package com.nextmail.attachment;

import com.nextmail.attachment.dto.AttachmentDownload;
import com.nextmail.attachment.dto.AttachmentResponseDTO;
import com.nextmail.attachment.storage.LocalStorageService;
import com.nextmail.attachment.storage.S3StorageService;
import com.nextmail.attachment.storage.StorageService;
import lombok.extern.slf4j.Slf4j;
import org.apache.tika.Tika;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Paths;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * Service managing email attachments with security validation, Apache Tika deep inspection,
 * cryptographic SHA-256 deduplication, and S3/local storage routing.
 */
@Service
@Slf4j
public class AttachmentService {

    public static final long MAX_FILE_SIZE = 25 * 1024 * 1024L; // 25 MB RFC standard quota

    private static final Set<String> DANGEROUS_MIME_TYPES = Set.of(
            "application/x-dosexec",
            "application/x-msdos-program",
            "application/x-msdownload",
            "application/x-sh",
            "application/x-bat",
            "application/x-msi",
            "application/vnd.microsoft.portable-executable"
    );

    private final AttachmentRepository attachmentRepository;
    private final LocalStorageService localStorageService;
    private final S3StorageService s3StorageService;
    private final String preferredStorageType;
    private final Tika tika;

    public AttachmentService(
            AttachmentRepository attachmentRepository,
            LocalStorageService localStorageService,
            S3StorageService s3StorageService,
            @Value("${nextmail.storage.type:local}") String preferredStorageType) {
        this.attachmentRepository = attachmentRepository;
        this.localStorageService = localStorageService;
        this.s3StorageService = s3StorageService;
        this.preferredStorageType = preferredStorageType;
        this.tika = new Tika();
    }

    /**
     * Uploads and cryptographically validates an attachment.
     */
    @Transactional
    public AttachmentResponseDTO uploadAttachment(UUID userId, MultipartFile file, UUID messageId) throws IOException {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("Cannot upload empty file");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("Attachment exceeds maximum allowed size of 25 MB");
        }

        String originalFilename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "attachment";
        String sanitizedFilename = sanitizeFilename(originalFilename);

        byte[] fileBytes = file.getBytes();

        // 1. Magic-byte MIME detection via Apache Tika
        String detectedContentType = tika.detect(new ByteArrayInputStream(fileBytes), sanitizedFilename);
        if (detectedContentType == null || detectedContentType.isBlank()) {
            detectedContentType = "application/octet-stream";
        }

        if (DANGEROUS_MIME_TYPES.contains(detectedContentType.toLowerCase())) {
            throw new SecurityException("Hazardous file type rejected: Executable binaries cannot be attached (" + detectedContentType + ")");
        }

        // 2. Cryptographic SHA-256 Checksum calculation
        String sha256 = calculateSha256(fileBytes);

        // 3. Storage selection & CAS (Content-Addressable Storage) Deduplication
        StorageService activeStorage = getActiveStorage();
        String storageKey;
        String storageEngine;

        Optional<Attachment> existingCas = attachmentRepository.findFirstBySha256(sha256);
        if (existingCas.isPresent() && activeStorage.exists(existingCas.get().getStorageKey())) {
            // Deduplicate: Reuse existing storage object
            storageKey = existingCas.get().getStorageKey();
            storageEngine = existingCas.get().getStorageEngine();
            log.info("CAS Deduplication: File '{}' matches existing SHA-256 {}. Reusing storage key {}",
                    sanitizedFilename, sha256, storageKey);
        } else {
            storageKey = String.format("attachments/%s/%s-%s", userId, UUID.randomUUID(), sanitizedFilename);
            activeStorage.store(storageKey, new ByteArrayInputStream(fileBytes), fileBytes.length, detectedContentType);
            storageEngine = activeStorage.getStorageEngineName();
            log.info("Stored new attachment object: {} using engine {}", storageKey, storageEngine);
        }

        Attachment attachment = Attachment.builder()
                .userId(userId)
                .messageId(messageId)
                .filename(sanitizedFilename)
                .declaredContentType(file.getContentType())
                .detectedContentType(detectedContentType)
                .sizeBytes(fileBytes.length)
                .sha256(sha256)
                .storageKey(storageKey)
                .storageEngine(storageEngine)
                .scanStatus(AttachmentScanStatus.CLEAN)
                .build();

        attachment = attachmentRepository.save(attachment);
        return mapToDto(attachment);
    }

    /**
     * Retrieves an attachment for download with access verification.
     */
    @Transactional(readOnly = true)
    public AttachmentDownload downloadAttachment(UUID attachmentId, UUID userId) {
        Attachment attachment = attachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new IllegalArgumentException("Attachment not found"));

        if (!attachment.getUserId().equals(userId)) {
            log.warn("Unauthorized access attempt to attachment {} by user {}", attachmentId, userId);
            throw new SecurityException("Access denied to attachment");
        }

        StorageService storage = "S3_MINIO".equalsIgnoreCase(attachment.getStorageEngine()) && s3StorageService.isAvailable()
                ? s3StorageService
                : localStorageService;

        InputStream stream = storage.load(attachment.getStorageKey());
        return AttachmentDownload.builder()
                .filename(attachment.getFilename())
                .contentType(attachment.getDetectedContentType())
                .contentLength(attachment.getSizeBytes())
                .inputStream(stream)
                .build();
    }

    /**
     * Lists all attachments associated with a message.
     */
    @Transactional(readOnly = true)
    public List<AttachmentResponseDTO> getAttachmentsByMessage(UUID messageId) {
        return attachmentRepository.findByMessageId(messageId).stream()
                .map(this::mapToDto)
                .toList();
    }

    /**
     * Links uploaded draft attachments to a sent message.
     */
    @Transactional
    public void linkAttachmentsToMessage(List<UUID> attachmentIds, UUID messageId) {
        if (attachmentIds == null || attachmentIds.isEmpty()) return;
        List<Attachment> attachments = attachmentRepository.findAllById(attachmentIds);
        for (Attachment att : attachments) {
            att.setMessageId(messageId);
        }
        attachmentRepository.saveAll(attachments);
    }

    public StorageService getActiveStorage() {
        if ("s3".equalsIgnoreCase(preferredStorageType) && s3StorageService.isAvailable()) {
            return s3StorageService;
        }
        return localStorageService;
    }

    public String sanitizeFilename(String filename) {
        if (filename == null) return "attachment";
        String clean = Paths.get(filename).getFileName().toString();
        clean = clean.replaceAll("[^a-zA-Z0-9._-]", "_");
        return clean.isEmpty() ? "attachment" : clean;
    }

    public String calculateSha256(byte[] data) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(data);
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 algorithm unavailable", e);
        }
    }

    private AttachmentResponseDTO mapToDto(Attachment att) {
        return AttachmentResponseDTO.builder()
                .id(att.getId())
                .messageId(att.getMessageId())
                .filename(att.getFilename())
                .declaredContentType(att.getDeclaredContentType())
                .detectedContentType(att.getDetectedContentType())
                .sizeBytes(att.getSizeBytes())
                .sha256(att.getSha256())
                .storageEngine(att.getStorageEngine())
                .scanStatus(att.getScanStatus())
                .isInline(att.isInline())
                .createdAt(att.getCreatedAt())
                .build();
    }
}
