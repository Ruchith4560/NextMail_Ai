package com.nextmail.notification.websocket;

import com.nextmail.auth.CustomUserDetailsService;
import com.nextmail.auth.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

/**
 * Interceptor authenticating STOMP CONNECT frames via JWT token in Authorization headers.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class StompAuthChannelInterceptor implements ChannelInterceptor {

    private final JwtTokenProvider jwtTokenProvider;
    private final CustomUserDetailsService userDetailsService;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null) {
            accessor = StompHeaderAccessor.wrap(message);
        }

        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            List<String> authHeaders = accessor.getNativeHeader("Authorization");
            if (authHeaders == null || authHeaders.isEmpty()) {
                authHeaders = accessor.getNativeHeader("X-Authorization");
            }

            if (authHeaders != null && !authHeaders.isEmpty()) {
                String authHeader = authHeaders.get(0);
                if (authHeader.startsWith("Bearer ")) {
                    String token = authHeader.substring(7);
                    if (jwtTokenProvider.validateToken(token)) {
                        UUID userId = jwtTokenProvider.getUserId(token);
                        UserDetails userDetails = userDetailsService.loadUserById(userId);
                        UsernamePasswordAuthenticationToken authentication =
                                new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());

                        if (accessor.isMutable()) {
                            accessor.setUser(authentication);
                        } else {
                            StompHeaderAccessor mutableAccessor = StompHeaderAccessor.wrap(message);
                            mutableAccessor.setUser(authentication);
                            return org.springframework.messaging.support.MessageBuilder
                                    .createMessage(message.getPayload(), mutableAccessor.getMessageHeaders());
                        }
                        log.info("STOMP CONNECT: Authenticated user {} for session {}", userId, accessor.getSessionId());
                    } else {
                        log.warn("STOMP CONNECT: Invalid JWT token provided");
                    }
                }
            } else {
                log.debug("STOMP CONNECT: Unauthenticated connection request for session {}", accessor.getSessionId());
            }
        }
        return message;
    }

}
