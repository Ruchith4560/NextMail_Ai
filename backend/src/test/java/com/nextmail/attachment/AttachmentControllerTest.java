package com.nextmail.attachment;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nextmail.auth.JwtTokenProvider;
import com.nextmail.auth.Role;
import com.nextmail.auth.User;
import com.nextmail.auth.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.nio.charset.StandardCharsets;
import java.util.UUID;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AttachmentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AttachmentRepository attachmentRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    private User testUser;
    private String jwtToken;

    @BeforeEach
    void setUp() {
        attachmentRepository.deleteAll();
        userRepository.deleteAll();

        testUser = User.builder()
                .email("attachments.user@nextmail.local")
                .passwordHash("DummyArgon2idHash")
                .fullName("Attachment Tester")
                .role(Role.ROLE_USER)
                .build();
        testUser = userRepository.save(testUser);
        jwtToken = jwtTokenProvider.generateAccessToken(testUser);
    }

    @Test
    @DisplayName("Upload without JWT returns 401 Unauthorized")
    void uploadAttachment_WithoutAuth_Returns401() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "test.txt",
                "text/plain",
                "Hello attachment".getBytes(StandardCharsets.UTF_8)
        );

        mockMvc.perform(multipart("/api/v1/attachments/upload").file(file))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Upload with JWT succeeds with 201 Created and Attachment Response DTO")
    void uploadAttachment_WithAuth_Returns201() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "project-architecture.txt",
                "text/plain",
                "Modular Monolith Architecture Specs".getBytes(StandardCharsets.UTF_8)
        );

        mockMvc.perform(multipart("/api/v1/attachments/upload")
                        .file(file)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtToken))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.filename").value("project-architecture.txt"))
                .andExpect(jsonPath("$.data.detectedContentType").value(containsString("text/plain")))
                .andExpect(jsonPath("$.data.sha256").isNotEmpty())
                .andExpect(jsonPath("$.data.storageEngine").isNotEmpty());
    }

    @Test
    @DisplayName("Upload and download attachment end-to-end")
    void uploadAndDownloadAttachment_Success() throws Exception {
        byte[] payload = "Critical architectural artifact content".getBytes(StandardCharsets.UTF_8);
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "artifact.txt",
                "text/plain",
                payload
        );

        MvcResult uploadResult = mockMvc.perform(multipart("/api/v1/attachments/upload")
                        .file(file)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtToken))
                .andExpect(status().isCreated())
                .andReturn();

        String responseBody = uploadResult.getResponse().getContentAsString();
        String attachmentIdStr = objectMapper.readTree(responseBody).path("data").path("id").asText();
        UUID attachmentId = UUID.fromString(attachmentIdStr);

        mockMvc.perform(get("/api/v1/attachments/{id}/download", attachmentId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtToken))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION, containsString("artifact.txt")))
                .andExpect(content().bytes(payload));
    }

    @Test
    @DisplayName("Get attachments by messageId returns list")
    void getAttachmentsByMessage_ReturnsList() throws Exception {
        UUID messageId = UUID.randomUUID();

        MockMultipartFile file = new MockMultipartFile(
                "file",
                "attachment1.txt",
                "text/plain",
                "Message attachment payload".getBytes(StandardCharsets.UTF_8)
        );

        mockMvc.perform(multipart("/api/v1/attachments/upload")
                        .file(file)
                        .param("messageId", messageId.toString())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtToken))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/v1/attachments/message/{messageId}", messageId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data[0].filename").value("attachment1.txt"));
    }
}
