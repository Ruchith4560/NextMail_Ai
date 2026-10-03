package com.nextmail.mail.dto;

import com.nextmail.mail.RecipientType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MessageRecipientDTO {
    private RecipientType type;
    private String email;
    private String name;
}
