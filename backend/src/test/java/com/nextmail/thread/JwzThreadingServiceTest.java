package com.nextmail.thread;

import com.nextmail.mail.MailFolder;
import com.nextmail.mail.Message;
import com.nextmail.mail.MessageRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.time.Instant;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
class JwzThreadingServiceTest {

    @Autowired
    private JwzThreadingService threadingService;

    @Autowired
    private ThreadRepository threadRepository;

    @Autowired
    private MessageRepository messageRepository;

    private UUID userId;

    @BeforeEach
    void setUp() {
        messageRepository.deleteAll();
        threadRepository.deleteAll();
        userId = UUID.randomUUID();
    }

    @Test
    @DisplayName("Normalize subject correctly removes international reply and forward prefixes")
    void shouldNormalizeSubjectPrefixes() {
        assertEquals("Project Apollo Review", threadingService.normalizeSubject("Re: Project Apollo Review"));
        assertEquals("Project Apollo Review", threadingService.normalizeSubject("RE:  Project Apollo Review"));
        assertEquals("Project Apollo Review", threadingService.normalizeSubject("Fwd: Project Apollo Review"));
        assertEquals("Project Apollo Review", threadingService.normalizeSubject("Re: Fwd: Re: Project Apollo Review"));
        assertEquals("Project Apollo Review", threadingService.normalizeSubject("AW: Project Apollo Review")); // German
        assertEquals("Project Apollo Review", threadingService.normalizeSubject("SV: Project Apollo Review")); // Scandinavian
        assertEquals("Meeting Notes", threadingService.normalizeSubject("Meeting Notes"));
        assertEquals("(No Subject)", threadingService.normalizeSubject(""));
        assertEquals("(No Subject)", threadingService.normalizeSubject(null));
    }

    @Test
    @DisplayName("JWZ resolves thread via RFC 5322 In-Reply-To header")
    void shouldGroupThreadViaInReplyTo() {
        Instant now = Instant.now();
        String initialMsgId = "<root-msg-101@nextmail.local>";

        // 1. Initial message creates Thread 1
        Thread initialThread = threadingService.resolveOrCreateThread(
                userId,
                "Architecture Decision Record: Spring Virtual Threads",
                null,
                null,
                "Hey team, here is the ADR...",
                now,
                false
        );

        Message rootMsg = Message.builder()
                .threadId(initialThread.getId())
                .userId(userId)
                .messageIdHeader(initialMsgId)
                .senderEmail("sarah@nextmail.local")
                .subject("Architecture Decision Record: Spring Virtual Threads")
                .bodyText("Hey team, here is the ADR...")
                .sentAt(now)
                .receivedAt(now)
                .folder(MailFolder.INBOX)
                .build();
        messageRepository.save(rootMsg);

        // 2. Incoming reply referencing root message via In-Reply-To
        Thread replyThread = threadingService.resolveOrCreateThread(
                userId,
                "Re: Architecture Decision Record: Spring Virtual Threads",
                initialMsgId,
                initialMsgId,
                "Looks great, approved!",
                now.plusSeconds(300),
                false
        );

        // Assert: Thread ID must match initial thread and message count incremented to 2!
        assertEquals(initialThread.getId(), replyThread.getId());
        assertEquals(2, replyThread.getMessageCount());
    }

    @Test
    @DisplayName("JWZ resolves thread via ancestor References header")
    void shouldGroupThreadViaReferencesHeader() {
        Instant now = Instant.now();
        String ancestorMsgId = "<ancestor-500@domain.com>";

        Thread ancestorThread = threadingService.resolveOrCreateThread(
                userId,
                "Q4 Roadmap Kickoff",
                null,
                null,
                "Initial kickoff thoughts...",
                now,
                false
        );

        Message ancestorMsg = Message.builder()
                .threadId(ancestorThread.getId())
                .userId(userId)
                .messageIdHeader(ancestorMsgId)
                .senderEmail("lead@domain.com")
                .subject("Q4 Roadmap Kickoff")
                .bodyText("Initial kickoff thoughts...")
                .sentAt(now)
                .receivedAt(now)
                .folder(MailFolder.INBOX)
                .build();
        messageRepository.save(ancestorMsg);

        // Reply where In-Reply-To was lost, but References contains ancestor
        String references = "<unknown-mid@domain.com> " + ancestorMsgId;
        Thread matchedThread = threadingService.resolveOrCreateThread(
                userId,
                "Fwd: Q4 Roadmap Kickoff",
                null,
                references,
                "Forwarding with comments...",
                now.plusSeconds(600),
                true
        );

        assertEquals(ancestorThread.getId(), matchedThread.getId());
        assertEquals(2, matchedThread.getMessageCount());
        assertTrue(matchedThread.isHasAttachments());
    }
}
