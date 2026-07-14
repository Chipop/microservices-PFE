package com.flowforge.email.mail;

import com.flowforge.email.template.RenderedEmail;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;

@Component
public class MimeMessageBuilder {

    public void buildMultipartMessage(MimeMessage message, RenderedEmail email) throws MessagingException {
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
        
        helper.setTo(email.recipient());
        helper.setSubject(email.subject());
        
        if (email.isHtml() && email.htmlBody() != null) {
            // Add both plain text and HTML alternatives
            helper.setText(email.body(), email.htmlBody());
        } else {
            // Plain text only
            helper.setText(email.body(), false);
        }
    }
}
