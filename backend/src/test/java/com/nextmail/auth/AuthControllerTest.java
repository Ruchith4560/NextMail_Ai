package com.nextmail.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nextmail.auth.dto.GoogleAuthRequest;
import com.nextmail.auth.dto.LoginRequest;
import com.nextmail.auth.dto.RefreshTokenRequest;
import com.nextmail.auth.dto.RegisterRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

    @BeforeEach
    void setUp() {
        refreshTokenRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    @DisplayName("User registration succeeds with valid parameters and returns JWT tokens")
    void shouldRegisterNewUserSuccessfully() throws Exception {
        RegisterRequest request = RegisterRequest.builder()
                .email("alex.rivera@nextmail.local")
                .password("SecureP@ssw0rd2026!")
                .fullName("Alex Rivera")
                .build();

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.accessToken").isString())
                .andExpect(jsonPath("$.data.refreshToken").isString())
                .andExpect(jsonPath("$.data.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.data.user.email").value("alex.rivera@nextmail.local"))
                .andExpect(jsonPath("$.data.user.fullName").value("Alex Rivera"));
    }

    @Test
    @DisplayName("User registration fails when email already exists")
    void shouldFailRegistrationWhenEmailAlreadyExists() throws Exception {
        RegisterRequest request = RegisterRequest.builder()
                .email("duplicate@nextmail.local")
                .password("Password123!")
                .fullName("Duplicate User")
                .build();

        // First registration
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated());

        // Second registration with duplicate email
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message", containsString("already exists")));
    }

    @Test
    @DisplayName("Login succeeds with correct credentials")
    void shouldLoginSuccessfullyWithValidCredentials() throws Exception {
        // Register user
        RegisterRequest registerReq = RegisterRequest.builder()
                .email("login.test@nextmail.local")
                .password("ValidPass123!")
                .fullName("Login Test User")
                .build();

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerReq)))
                .andExpect(status().isCreated());

        // Perform login
        LoginRequest loginReq = LoginRequest.builder()
                .email("login.test@nextmail.local")
                .password("ValidPass123!")
                .build();

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.data.refreshToken").isNotEmpty());
    }

    @Test
    @DisplayName("Login fails with invalid password")
    void shouldFailLoginWithInvalidPassword() throws Exception {
        RegisterRequest registerReq = RegisterRequest.builder()
                .email("wrong.pass@nextmail.local")
                .password("CorrectPassword1!")
                .fullName("User")
                .build();

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerReq)))
                .andExpect(status().isCreated());

        LoginRequest loginReq = LoginRequest.builder()
                .email("wrong.pass@nextmail.local")
                .password("WrongPassword999!")
                .build();

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginReq)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("Refresh token rotation succeeds and invalidates previous token")
    void shouldRotateRefreshTokenSuccessfully() throws Exception {
        RegisterRequest registerReq = RegisterRequest.builder()
                .email("refresh.test@nextmail.local")
                .password("Pass456!Rot")
                .fullName("Rotation User")
                .build();

        MvcResult registerResult = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerReq)))
                .andExpect(status().isCreated())
                .andReturn();

        String responseBody = registerResult.getResponse().getContentAsString();
        String originalRefreshToken = objectMapper.readTree(responseBody).get("data").get("refreshToken").asText();

        // Rotate token
        RefreshTokenRequest refreshReq = RefreshTokenRequest.builder()
                .refreshToken(originalRefreshToken)
                .build();

        MvcResult refreshResult = mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(refreshReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.data.refreshToken").isNotEmpty())
                .andReturn();

        String rotatedBody = refreshResult.getResponse().getContentAsString();
        String newRefreshToken = objectMapper.readTree(rotatedBody).get("data").get("refreshToken").asText();

        // Verify that the new token is different from the original token
        org.junit.jupiter.api.Assertions.assertNotEquals(originalRefreshToken, newRefreshToken);

        // Attempting to reuse the original refresh token triggers security reuse detection!
        mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(refreshReq)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message", containsString("reuse detected")));
    }

    @Test
    @DisplayName("Protected endpoint /me requires valid JWT Bearer authentication")
    void shouldProtectMeEndpoint() throws Exception {
        // Without token
        mockMvc.perform(get("/api/v1/auth/me"))
                .andExpect(status().isUnauthorized());

        // Register and get token
        RegisterRequest registerReq = RegisterRequest.builder()
                .email("me.test@nextmail.local")
                .password("Pass789!Me")
                .fullName("Current User")
                .build();

        MvcResult registerResult = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerReq)))
                .andExpect(status().isCreated())
                .andReturn();

        String accessToken = objectMapper.readTree(registerResult.getResponse().getContentAsString())
                .get("data").get("accessToken").asText();

        // With valid token
        mockMvc.perform(get("/api/v1/auth/me")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.email").value("me.test@nextmail.local"))
                .andExpect(jsonPath("$.data.fullName").value("Current User"));
    }

    @Test
    @DisplayName("Google OAuth2 login successfully auto-provisions new user and returns JWT session")
    void shouldLoginWithGoogleAndAutoProvisionAccount() throws Exception {
        GoogleAuthRequest request = GoogleAuthRequest.builder()
                .idToken("mock_google_token_sophia.clark@gmail.com")
                .build();

        mockMvc.perform(post("/api/v1/auth/google")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.data.refreshToken").isNotEmpty())
                .andExpect(jsonPath("$.data.user.email").value("sophia.clark@gmail.com"))
                .andExpect(jsonPath("$.data.user.fullName").value("Sophia clark"));
    }

    @Test
    @DisplayName("Google OAuth2 login succeeds for already registered email account")
    void shouldLoginExistingUserWithGoogle() throws Exception {
        // Pre-create user with local credentials
        RegisterRequest registerReq = RegisterRequest.builder()
                .email("existing.user@gmail.com")
                .password("ExistingPassword123!")
                .fullName("Existing User")
                .build();

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerReq)))
                .andExpect(status().isCreated());

        // Now login via Google
        GoogleAuthRequest googleReq = GoogleAuthRequest.builder()
                .idToken("mock_google_token_existing.user@gmail.com")
                .build();

        mockMvc.perform(post("/api/v1/auth/google")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(googleReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.data.user.email").value("existing.user@gmail.com"))
                .andExpect(jsonPath("$.data.user.fullName").value("Existing User"));
    }

    @Test
    @DisplayName("Google OAuth2 login rejects blank token")
    void shouldRejectBlankGoogleToken() throws Exception {
        GoogleAuthRequest request = GoogleAuthRequest.builder()
                .idToken("   ")
                .build();

        mockMvc.perform(post("/api/v1/auth/google")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }
}
