package com.nextmail.search;

import com.nextmail.auth.User;
import com.nextmail.mail.MailFolder;
import com.nextmail.mail.Message;
import com.nextmail.mail.MessageRecipient;
import com.nextmail.mail.RecipientType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class SearchServiceTest {

    private final SearchService searchService = new SearchService(null);

    @Test
    @DisplayName("toDocument correctly extracts all metadata, snippets, and recipients")
    void shouldExtractDocumentFromMessage() {
        UUID messageId = UUID.randomUUID();
        UUID threadId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();

        Message msg = Message.builder()
                .id(messageId)
                .threadId(threadId)
                .userId(userId)
                .subject("Quarterly Financial Review 2026")
                .bodyText("Here is the full financial summary. We achieved 42% ARR growth and lowered churn.")
                .senderEmail("cfo@nextmail.local")
                .senderName("Chief Financial Officer")
                .folder(MailFolder.INBOX)
                .hasAttachments(true)
                .isStarred(true)
                .isRead(false)
                .isControlled(false)
                .receivedAt(Instant.now())
                .recipients(List.of(
                        MessageRecipient.builder().type(RecipientType.TO).email("ceo@nextmail.local").build(),
                        MessageRecipient.builder().type(RecipientType.CC).email("board@nextmail.local").build()
                ))
                .build();

        EmailSearchDocument doc = searchService.toDocument(msg);

        assertThat(doc.getId()).isEqualTo(messageId.toString());
        assertThat(doc.getThreadId()).isEqualTo(threadId.toString());
        assertThat(doc.getUserId()).isEqualTo(userId.toString());
        assertThat(doc.getSubject()).isEqualTo("Quarterly Financial Review 2026");
        assertThat(doc.getSenderEmail()).isEqualTo("cfo@nextmail.local");
        assertThat(doc.getRecipientEmails()).containsExactlyInAnyOrder("ceo@nextmail.local", "board@nextmail.local");
        assertThat(doc.isHasAttachments()).isTrue();
        assertThat(doc.isStarred()).isTrue();
        assertThat(doc.isRead()).isFalse();
        assertThat(doc.getSnippet()).startsWith("Here is the full financial summary");
    }

    @Test
    @DisplayName("highlightText wraps case-insensitive matches in custom HTML mark tags")
    void shouldHighlightMatchesCaseInsensitively() {
        String text = "Please review the quarterly INVOICE from vendor AWS before Friday.";
        String query = "invoice";

        String highlighted = searchService.highlightText(text, query);

        assertThat(highlighted).contains("<mark class=\"bg-amber-400/25 text-amber-200 px-0.5 rounded\">INVOICE</mark>");
    }

    @Test
    @DisplayName("extractSnippet truncates long texts at 160 characters with ellipsis")
    void shouldTruncateLongSnippet() {
        String longText = "A".repeat(300);
        String snippet = searchService.extractSnippet(longText);

        assertThat(snippet).hasSize(163); // 160 chars + "..."
        assertThat(snippet).endsWith("...");
    }
}
