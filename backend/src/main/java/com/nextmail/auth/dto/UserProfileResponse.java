package com.nextmail.auth.dto;

import com.nextmail.auth.Role;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserProfileResponse {
    private UUID id;
    private String email;
    private String fullName;
    private Role role;
    private boolean mfaEnabled;
    private Instant createdAt;
}
