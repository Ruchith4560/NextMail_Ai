package com.nextmail.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nextmail.ai.dto.AiReplyRequest;
import com.nextmail.ai.dto.AiReplyResponse;
import com.nextmail.ai.dto.AiSummaryResponse;
import com.nextmail.ai.dto.ReplyTone;
import com.nextmail.mail.MailFolder;
import com.nextmail.mail.Message;
import com.nextmail.mail.MessageRepository;
import com.nextmail.thread.PriorityTier;
import com.nextmail.thread.Thread;
import com.nextmail.thread.ThreadRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AiIntelligenceServiceTest {

    @Mock
    private GeminiAiClient geminiAiClient;

    @Mock
    private ThreadRepository threadRepository;

    @Mock
    private MessageRepository messageRepository;

    @Mock
    private ThreadSummaryRepository threadSummaryRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private AiIntelligenceService aiIntelligenceService;

    @BeforeEach
    void setUp() {
        aiIntelligenceService = new AiIntelligenceService(
                geminiAiClient,
                threadRepository,
                messageRepository,
                threadSummaryRepository,
                objectMapper
        );
        // By default, simulate unconfigured Gemini to exercise deterministic heuristic intelligence engine
        when(geminiAiClient.isConfigured()).thenReturn(false);
    }

    @Test
    @DisplayName("Heuristic summary marks urgent threads with P0/outage/deadline keywords as URGENT")
    void shouldClassifyUrgentThreadCorrectly() {
        UUID threadId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();

        Thread thread = Thread.builder()
                .id(threadId)
                .userId(userId)
                .subject("CRITICAL: Production DB Failover Procedure P0")
                .firstMessageAt(Instant.now())
                .lastMessageAt(Instant.now())
                .build();

        Message msg = Message.builder()
                .id(UUID.randomUUID())
                .threadId(threadId)
                .userId(userId)
                .senderEmail("devops@nextmail.local")
                .senderName("SRE Lead")
                .subject("CRITICAL: Production DB Failover Procedure P0")
                .bodyText("Team, we have an urgent outage blocker. Please confirm rollback plan ASAP?")
                .sentAt(Instant.now())
                .receivedAt(Instant.now())
                .folder(MailFolder.INBOX)
                .build();

        when(threadRepository.findByIdAndUserId(threadId, userId)).thenReturn(Optional.of(thread));
        when(messageRepository.findByThreadIdAndUserIdOrderBySentAtAsc(threadId, userId)).thenReturn(List.of(msg));
        when(threadSummaryRepository.findByThreadId(threadId)).thenReturn(Optional.empty());

        AiSummaryResponse summary = aiIntelligenceService.summarizeThread(threadId, userId);

        assertThat(summary.getPriorityTier()).isEqualTo(PriorityTier.URGENT);
        assertThat(summary.getPriorityScore()).isGreaterThanOrEqualTo(0.9);
        assertThat(summary.getPriorityReason()).contains("urgent");
        assertThat(summary.getActionItems()).isNotEmpty();
        assertThat(summary.getOverview()).contains("Production DB Failover");
    }

    @Test
    @DisplayName("Generate draft reply adapts to requested CONCISE and FIRM tones")
    void shouldGenerateDraftReplyWithDifferentTones() {
        UUID threadId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();

        Thread thread = Thread.builder()
                .id(threadId)
                .userId(userId)
                .subject("Vendor Renewal Terms")
                .build();

        Message msg = Message.builder()
                .id(UUID.randomUUID())
                .threadId(threadId)
                .userId(userId)
                .senderEmail("vendor@partner.com")
                .senderName("Vendor Rep")
                .subject("Vendor Renewal Terms")
                .bodyText("Could you please review the 20% price increase for next quarter?")
                .sentAt(Instant.now())
                .build();

        when(threadRepository.findByIdAndUserId(threadId, userId)).thenReturn(Optional.of(thread));
        when(messageRepository.findByThreadIdAndUserIdOrderBySentAtAsc(threadId, userId)).thenReturn(List.of(msg));

        // Test CONCISE tone
        AiReplyRequest conciseReq = AiReplyRequest.builder()
                .tone(ReplyTone.CONCISE)
                .instructions("Confirm we cannot accept price increases")
                .build();

        AiReplyResponse conciseRes = aiIntelligenceService.generateDraftReply(threadId, userId, conciseReq);
        assertThat(conciseRes.getTone()).isEqualTo(ReplyTone.CONCISE);
        assertThat(conciseRes.getSuggestedReplyText()).contains("Hi Vendor");
        assertThat(conciseRes.getSuggestedReplyText()).contains("Confirm we cannot accept price increases");

        // Test FIRM tone
        AiReplyRequest firmReq = AiReplyRequest.builder()
                .tone(ReplyTone.FIRM)
                .instructions("Deliver by Friday or contract void")
                .build();

        AiReplyResponse firmRes = aiIntelligenceService.generateDraftReply(threadId, userId, firmReq);
        assertThat(firmRes.getTone()).isEqualTo(ReplyTone.FIRM);
        assertThat(firmRes.getSuggestedReplyText()).contains("Deliver by Friday or contract void");
    }
}
