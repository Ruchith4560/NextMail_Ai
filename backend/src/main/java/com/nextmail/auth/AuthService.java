package com.nextmail.auth;

import com.nextmail.auth.dto.*;
import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;
    private final TokenBlacklistService blacklistService;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String normalizedEmail = request.getEmail().toLowerCase().trim();

        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new IllegalArgumentException("An account with email " + normalizedEmail + " already exists");
        }

        User user = User.builder()
                .email(normalizedEmail)
                .fullName(request.getFullName().trim())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .role(Role.ROLE_USER)
                .build();

        user = userRepository.save(user);
        log.info("Registered new user with ID: {}", user.getId());

        return createAuthSession(user);
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        String normalizedEmail = request.getEmail().toLowerCase().trim();

        User user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            log.warn("Failed login attempt for user: {}", normalizedEmail);
            throw new BadCredentialsException("Invalid email or password");
        }

        log.info("Successful login for user ID: {}", user.getId());
        return createAuthSession(user);
    }

    @Transactional
    public AuthResponse refreshToken(RefreshTokenRequest request) {
        String tokenHash = tokenProvider.hashToken(request.getRefreshToken());

        RefreshToken storedToken = refreshTokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new BadCredentialsException("Invalid refresh token"));

        // Refresh token reuse detection (RFC 6749 security best practice)
        if (storedToken.isRevoked()) {
            log.error("SECURITY ALERT: Compromised refresh token reuse detected for family: {}. Revoking all family tokens!", storedToken.getFamilyId());
            refreshTokenRepository.revokeAllByFamilyId(storedToken.getFamilyId());
            throw new BadCredentialsException("Compromised session token reuse detected. Entire session chain revoked.");
        }

        if (storedToken.isExpired()) {
            throw new BadCredentialsException("Refresh token has expired. Please log in again.");
        }

        // Invalidate the used token (single-use rotation)
        storedToken.setRevoked(true);
        refreshTokenRepository.save(storedToken);

        User user = userRepository.findById(storedToken.getUserId())
                .orElseThrow(() -> new IllegalStateException("User associated with token no longer exists"));

        // Issue new access token and new rotated refresh token in the same family
        String newAccessToken = tokenProvider.generateAccessToken(user);
        String newRawRefreshToken = tokenProvider.generateRefreshToken();
        String newRefreshTokenHash = tokenProvider.hashToken(newRawRefreshToken);

        RefreshToken nextToken = RefreshToken.builder()
                .userId(user.getId())
                .tokenHash(newRefreshTokenHash)
                .familyId(storedToken.getFamilyId())
                .expiresAt(Instant.now().plusMillis(tokenProvider.getRefreshExpirationMs()))
                .build();
        refreshTokenRepository.save(nextToken);

        return AuthResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(newRawRefreshToken)
                .expiresInMs(tokenProvider.getAccessExpirationMs())
                .user(mapToUserProfile(user))
                .build();
    }

    @Transactional
    public void logout(String authHeader, String rawRefreshToken) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String accessToken = authHeader.substring(7);
            if (tokenProvider.validateToken(accessToken)) {
                Claims claims = tokenProvider.getClaims(accessToken);
                Date exp = claims.getExpiration();
                Duration remainingTtl = Duration.between(Instant.now(), exp.toInstant());
                if (!remainingTtl.isNegative()) {
                    String hash = tokenProvider.hashToken(accessToken);
                    blacklistService.blacklistToken(hash, remainingTtl);
                }
            }
        }

        if (rawRefreshToken != null && !rawRefreshToken.isBlank()) {
            String refreshHash = tokenProvider.hashToken(rawRefreshToken);
            refreshTokenRepository.findByTokenHash(refreshHash).ifPresent(rt -> {
                rt.setRevoked(true);
                refreshTokenRepository.save(rt);
            });
        }
    }

    @Transactional(readOnly = true)
    public UserProfileResponse getCurrentUserProfile(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        return mapToUserProfile(user);
    }

    private AuthResponse createAuthSession(User user) {
        String accessToken = tokenProvider.generateAccessToken(user);
        String rawRefreshToken = tokenProvider.generateRefreshToken();
        String refreshTokenHash = tokenProvider.hashToken(rawRefreshToken);

        RefreshToken refreshToken = RefreshToken.builder()
                .userId(user.getId())
                .tokenHash(refreshTokenHash)
                .familyId(UUID.randomUUID())
                .expiresAt(Instant.now().plusMillis(tokenProvider.getRefreshExpirationMs()))
                .build();
        refreshTokenRepository.save(refreshToken);

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(rawRefreshToken)
                .expiresInMs(tokenProvider.getAccessExpirationMs())
                .user(mapToUserProfile(user))
                .build();
    }

    private UserProfileResponse mapToUserProfile(User user) {
        return UserProfileResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .role(user.getRole())
                .mfaEnabled(user.isMfaEnabled())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
