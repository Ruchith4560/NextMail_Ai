package com.nextmail.notification.websocket;

import com.nextmail.auth.CustomUserDetails;
import com.nextmail.auth.CustomUserDetailsService;
import com.nextmail.auth.JwtTokenProvider;
import com.nextmail.auth.Role;
import com.nextmail.auth.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.security.core.Authentication;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class StompAuthChannelInterceptorTest {

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @Mock
    private CustomUserDetailsService userDetailsService;

    @Mock
    private MessageChannel messageChannel;

    private StompAuthChannelInterceptor interceptor;

    private final UUID testUserId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        interceptor = new StompAuthChannelInterceptor(jwtTokenProvider, userDetailsService);
    }

    @Test
    @DisplayName("STOMP CONNECT with valid JWT authenticates session user")
    void preSend_ValidJwt_Authenticates() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        accessor.setLeaveMutable(true);
        accessor.addNativeHeader("Authorization", "Bearer valid.jwt.token");
        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());


        User user = User.builder()
                .id(testUserId)
                .email("user@nextmail.local")
                .role(Role.ROLE_USER)
                .passwordHash("hash")
                .fullName("Test User")
                .build();
        CustomUserDetails userDetails = new CustomUserDetails(user);

        when(jwtTokenProvider.validateToken("valid.jwt.token")).thenReturn(true);
        when(jwtTokenProvider.getUserId("valid.jwt.token")).thenReturn(testUserId);
        when(userDetailsService.loadUserById(testUserId)).thenReturn(userDetails);

        Message<?> result = interceptor.preSend(message, messageChannel);

        assertThat(result).isNotNull();
        StompHeaderAccessor resultAccessor = StompHeaderAccessor.wrap(result);
        Authentication auth = (Authentication) resultAccessor.getUser();
        assertThat(auth).isNotNull();
        assertThat(auth.getPrincipal()).isEqualTo(userDetails);
    }

    @Test
    @DisplayName("STOMP CONNECT without Authorization header passes through without user")
    void preSend_NoAuthHeader_PassesThrough() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        Message<?> result = interceptor.preSend(message, messageChannel);

        assertThat(result).isNotNull();
        StompHeaderAccessor resultAccessor = StompHeaderAccessor.wrap(result);
        assertThat(resultAccessor.getUser()).isNull();
        verifyNoInteractions(jwtTokenProvider);
    }
}
