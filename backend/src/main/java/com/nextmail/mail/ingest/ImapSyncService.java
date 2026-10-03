package com.nextmail.mail.ingest;

import jakarta.mail.*;
import jakarta.mail.internet.MimeMessage;
import jakarta.mail.search.FlagTerm;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Properties;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ImapSyncService {

    private final MimeNormalizationService normalizationService;
    private final IdempotentIngestionService ingestionService;

    @Value("${imap.host:localhost}")
    private String imapHost;

    @Value("${imap.port:3143}")
    private int imapPort;

    @Value("${imap.ssl:false}")
    private boolean imapSsl;

    public CompletableFuture<Integer> syncMailboxAsync(UUID userId, String username, String password) {
        return CompletableFuture.supplyAsync(() -> syncMailbox(userId, username, password),
                Executors.newVirtualThreadPerTaskExecutor());
    }

    public int syncMailbox(UUID userId, String username, String password) {
        Properties props = new Properties();
        String protocol = imapSsl ? "imaps" : "imap";
        props.put("mail." + protocol + ".host", imapHost);
        props.put("mail." + protocol + ".port", String.valueOf(imapPort));
        props.put("mail." + protocol + ".ssl.enable", String.valueOf(imapSsl));
        props.put("mail." + protocol + ".connectiontimeout", "5000");
        props.put("mail." + protocol + ".timeout", "5000");

        Session session = Session.getInstance(props);
        Store store = null;
        Folder inbox = null;
        int ingestedCount = 0;

        try {
            store = session.getStore(protocol);
            log.info("Connecting to IMAP {}:{} for user {}", imapHost, imapPort, username);
            store.connect(imapHost, imapPort, username, password);

            inbox = store.getFolder("INBOX");
            if (!inbox.exists()) {
                log.warn("INBOX folder does not exist on remote IMAP server");
                return 0;
            }

            inbox.open(Folder.READ_ONLY);
            // Search for unread messages (or all if desired)
            Message[] messages = inbox.search(new FlagTerm(new Flags(Flags.Flag.SEEN), false));
            log.info("Found {} unread messages on IMAP server for {}", messages.length, username);

            for (Message msg : messages) {
                if (msg instanceof MimeMessage mimeMessage) {
                    try {
                        NormalizedEmail normalized = normalizationService.parseMimeMessage(mimeMessage);
                        ingestionService.ingestEmail(userId, normalized);
                        ingestedCount++;
                    } catch (Exception ex) {
                        log.error("Failed to parse/ingest individual IMAP message: {}", ex.getMessage());
                    }
                }
            }

            return ingestedCount;
        } catch (AuthenticationFailedException ex) {
            log.error("IMAP Authentication failed for {}: {}", username, ex.getMessage());
            throw new IllegalArgumentException("IMAP authentication failed: " + ex.getMessage());
        } catch (Exception ex) {
            log.warn("IMAP sync error (IMAP server may be offline): {}", ex.getMessage());
            return 0;
        } finally {
            try {
                if (inbox != null && inbox.isOpen()) {
                    inbox.close(false);
                }
                if (store != null && store.isConnected()) {
                    store.close();
                }
            } catch (Exception ignored) {
            }
        }
    }
}
