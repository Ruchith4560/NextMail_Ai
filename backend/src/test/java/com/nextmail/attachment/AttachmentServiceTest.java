package com.nextmail.attachment;

import com.nextmail.attachment.dto.AttachmentDownload;
import com.nextmail.attachment.dto.AttachmentResponseDTO;
import com.nextmail.attachment.storage.LocalStorageService;
import com.nextmail.attachment.storage.S3StorageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AttachmentServiceTest {

    @Mock
    private AttachmentRepository attachmentRepository;

    @Mock
    private LocalStorageService localStorageService;

    @Mock
    private S3StorageService s3StorageService;

    private AttachmentService attachmentService;

    private final UUID testUserId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        // Configure local storage as default active storage
        lenient().when(localStorageService.getStorageEngineName()).thenReturn("LOCAL_FS");
        attachmentService = new AttachmentService(
                attachmentRepository,
                localStorageService,
                s3StorageService,
                "local"
        );
    }

    @Test
    @DisplayName("Successfully uploads and detects valid PDF with Apache Tika magic bytes")
    void uploadAttachment_ValidPdf_Success() throws IOException {
        byte[] pdfBytes = "%PDF-1.4\n%âãÏÓ\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF".getBytes(StandardCharsets.ISO_8859_1);
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "invoice-q3.pdf",
                "application/octet-stream", // Client declares generic octet-stream
                pdfBytes
        );

        when(attachmentRepository.findFirstBySha256(any())).thenReturn(Optional.empty());
        when(attachmentRepository.save(any(Attachment.class))).thenAnswer(invocation -> {
            Attachment att = invocation.getArgument(0);
            att.setId(UUID.randomUUID());
            return att;
        });

        AttachmentResponseDTO response = attachmentService.uploadAttachment(testUserId, file, null);

        assertThat(response).isNotNull();
        assertThat(response.getFilename()).isEqualTo("invoice-q3.pdf");
        assertThat(response.getDetectedContentType()).isEqualTo("application/pdf");
        assertThat(response.getSha256()).isNotBlank();
        assertThat(response.getStorageEngine()).isEqualTo("LOCAL_FS");
        assertThat(response.getScanStatus()).isEqualTo(AttachmentScanStatus.CLEAN);

        verify(localStorageService).store(any(), any(), eq((long) pdfBytes.length), eq("application/pdf"));
        verify(attachmentRepository).save(any(Attachment.class));
    }

    @Test
    @DisplayName("Rejects hazardous executable binary regardless of fake extension")
    void uploadAttachment_ExecutableBinary_Rejected() {
        // DOS MZ Header magic bytes (0x4D, 0x5A) followed by PE structure
        byte[] dosExecutableBytes = new byte[128];
        dosExecutableBytes[0] = 0x4D;
        dosExecutableBytes[1] = 0x5A;
        dosExecutableBytes[2] = (byte) 0x90;
        dosExecutableBytes[3] = 0x00;

        MockMultipartFile file = new MockMultipartFile(
                "file",
                "harmless_document.pdf", // Pretending to be a PDF
                "application/pdf",
                dosExecutableBytes
        );

        assertThatThrownBy(() -> attachmentService.uploadAttachment(testUserId, file, null))
                .isInstanceOf(SecurityException.class)
                .hasMessageContaining("Hazardous file type rejected");

        verifyNoInteractions(localStorageService);
        verify(attachmentRepository, never()).save(any());
    }

    @Test
    @DisplayName("Rejects empty file upload")
    void uploadAttachment_EmptyFile_ThrowsException() {
        MockMultipartFile file = new MockMultipartFile("file", "empty.txt", "text/plain", new byte[0]);

        assertThatThrownBy(() -> attachmentService.uploadAttachment(testUserId, file, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Cannot upload empty file");
    }

    @Test
    @DisplayName("Content-Addressable Storage (CAS): Reuses existing storage key for identical SHA-256")
    void uploadAttachment_CasDeduplication_ReusesKey() throws IOException {
        byte[] content = "Duplicate content for deduplication test".getBytes(StandardCharsets.UTF_8);
        MockMultipartFile file = new MockMultipartFile("file", "document2.txt", "text/plain", content);

        String existingKey = "attachments/user1/existing-key-document.txt";
        Attachment existingAttachment = Attachment.builder()
                .id(UUID.randomUUID())
                .userId(UUID.randomUUID())
                .storageKey(existingKey)
                .storageEngine("LOCAL_FS")
                .sha256("calculated-sha")
                .filename("original.txt")
                .build();

        when(attachmentRepository.findFirstBySha256(any())).thenReturn(Optional.of(existingAttachment));
        when(localStorageService.exists(existingKey)).thenReturn(true);
        when(attachmentRepository.save(any(Attachment.class))).thenAnswer(inv -> {
            Attachment att = inv.getArgument(0);
            att.setId(UUID.randomUUID());
            return att;
        });

        AttachmentResponseDTO response = attachmentService.uploadAttachment(testUserId, file, null);

        assertThat(response).isNotNull();
        // Storage store should NOT have been called due to CAS deduplication!
        verify(localStorageService, never()).store(any(), any(), anyLong(), any());

        ArgumentCaptor<Attachment> savedCaptor = ArgumentCaptor.forClass(Attachment.class);
        verify(attachmentRepository).save(savedCaptor.capture());
        assertThat(savedCaptor.getValue().getStorageKey()).isEqualTo(existingKey);
    }

    @Test
    @DisplayName("Download verification: Rejects unauthorized user access")
    void downloadAttachment_UnauthorizedUser_ThrowsSecurityException() {
        UUID attachmentId = UUID.randomUUID();
        UUID ownerId = UUID.randomUUID();
        UUID attackerId = UUID.randomUUID();

        Attachment attachment = Attachment.builder()
                .id(attachmentId)
                .userId(ownerId)
                .storageKey("some/key")
                .storageEngine("LOCAL_FS")
                .build();

        when(attachmentRepository.findById(attachmentId)).thenReturn(Optional.of(attachment));

        assertThatThrownBy(() -> attachmentService.downloadAttachment(attachmentId, attackerId))
                .isInstanceOf(SecurityException.class)
                .hasMessageContaining("Access denied");
    }

    @Test
    @DisplayName("Download verification: Allows owner to download attachment")
    void downloadAttachment_Owner_Success() {
        UUID attachmentId = UUID.randomUUID();
        Attachment attachment = Attachment.builder()
                .id(attachmentId)
                .userId(testUserId)
                .filename("report.txt")
                .detectedContentType("text/plain")
                .sizeBytes(100L)
                .storageKey("attachments/report.txt")
                .storageEngine("LOCAL_FS")
                .build();

        when(attachmentRepository.findById(attachmentId)).thenReturn(Optional.of(attachment));
        when(localStorageService.load("attachments/report.txt"))
                .thenReturn(new ByteArrayInputStream("Sample file contents".getBytes(StandardCharsets.UTF_8)));

        AttachmentDownload download = attachmentService.downloadAttachment(attachmentId, testUserId);

        assertThat(download).isNotNull();
        assertThat(download.getFilename()).isEqualTo("report.txt");
        assertThat(download.getContentType()).isEqualTo("text/plain");
        assertThat(download.getContentLength()).isEqualTo(100L);
        assertThat(download.getInputStream()).isNotNull();
    }
}
