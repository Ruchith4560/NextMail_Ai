package com.nextmail.mail;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "message_recipients", indexes = {
        @Index(name = "idx_recipients_email", columnList = "email")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MessageRecipient {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "message_id", nullable = false)
    @JsonIgnore
    private Message message;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private RecipientType type;

    @Column(nullable = false, length = 255)
    private String email;

    @Column(length = 255)
    private String name;
}
