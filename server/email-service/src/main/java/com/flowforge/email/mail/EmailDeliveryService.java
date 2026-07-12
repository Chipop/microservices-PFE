package com.flowforge.email.mail;

import com.flowforge.email.config.EmailProperties;
import com.flowforge.email.delivery.DeliveryStatus;
import com.flowforge.email.delivery.EmailDelivery;
import com.flowforge.email.delivery.EmailDeliveryRepository;
import com.flowforge.email.event.DomainEvent;
import com.flowforge.email.template.RenderedEmail;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;

@Service
public class EmailDeliveryService {
    private static final Logger logger = LoggerFactory.getLogger(EmailDeliveryService.class);

    private final EmailDeliveryRepository deliveries;
    private final JavaMailSender mailSender;
    private final EmailProperties properties;

    public EmailDeliveryService(
            EmailDeliveryRepository deliveries,
            JavaMailSender mailSender,
            EmailProperties properties
    ) {
        this.deliveries = deliveries;
        this.mailSender = mailSender;
        this.properties = properties;
    }

    @Transactional
    public void deliver(DomainEvent event, RenderedEmail email) {
        var delivery = findOrCreateDelivery(event, email);
        if (delivery.getStatus() == DeliveryStatus.SENT) {
            logger.debug("Skipping duplicate email delivery {}", delivery.getIdempotencyKey());
            return;
        }
        if (!email.shouldSend()) {
            markPermanentFailure(delivery, email.failureReason());
            return;
        }
        sendWithRetry(delivery, email);
    }

    private EmailDelivery findOrCreateDelivery(DomainEvent event, RenderedEmail email) {
        var key = idempotencyKey(event, email);
        return deliveries.findByIdempotencyKey(key).orElseGet(() -> {
            var delivery = new EmailDelivery();
            delivery.setIdempotencyKey(key);
            delivery.setSourceEventId(event.eventId());
            delivery.setSourceEventType(event.eventType());
            delivery.setProducer(event.producer());
            delivery.setRecipientEmail(email.recipient());
            delivery.setSubject(email.subject());
            delivery.setTemplateKey(email.templateKey());
            return deliveries.save(delivery);
        });
    }

    private void markPermanentFailure(EmailDelivery delivery, String reason) {
        delivery.setStatus(DeliveryStatus.FAILED_PERMANENT);
        delivery.setLastError(reason);
        deliveries.save(delivery);
        logger.warn("Failed email delivery {} permanently: {}", delivery.getIdempotencyKey(), reason);
    }

    private void sendWithRetry(EmailDelivery delivery, RenderedEmail email) {
        var maxAttempts = Math.max(1, properties.maxAttempts());
        while (delivery.getAttemptCount() < maxAttempts) {
            try {
                delivery.setAttemptCount(delivery.getAttemptCount() + 1);
                mailSender.send(toMessage(email));
                delivery.setStatus(DeliveryStatus.SENT);
                delivery.setSentAt(Instant.now());
                delivery.setLastError(null);
                deliveries.save(delivery);
                logger.info("Sent {} email to {}", email.templateKey(), email.recipient());
                return;
            } catch (MailException exc) {
                delivery.setStatus(delivery.getAttemptCount() >= maxAttempts
                        ? DeliveryStatus.FAILED_PERMANENT
                        : DeliveryStatus.FAILED_RETRYABLE);
                delivery.setLastError(trimError(exc));
                deliveries.save(delivery);
                if (delivery.getAttemptCount() < maxAttempts) {
                    sleepBeforeRetry();
                }
            }
        }
        logger.warn("Failed {} email to {} after {} attempts",
                email.templateKey(),
                email.recipient(),
                delivery.getAttemptCount());
    }

    private SimpleMailMessage toMessage(RenderedEmail email) {
        var message = new SimpleMailMessage();
        message.setFrom(properties.from());
        message.setTo(email.recipient());
        message.setSubject(email.subject());
        message.setText(email.body());
        return message;
    }

    private void sleepBeforeRetry() {
        try {
            Thread.sleep(Math.max(0, properties.retryBackoffMs()));
        } catch (InterruptedException exc) {
            Thread.currentThread().interrupt();
        }
    }

    private String idempotencyKey(DomainEvent event, RenderedEmail email) {
        String raw;
        if (event.eventId() != null && !event.eventId().isBlank()) {
            raw = event.eventId() + ":" + event.eventType() + ":" + email.templateKey() + ":" + nullToEmpty(email.recipient());
        } else {
            var resourceId = event.resource() == null ? "" : nullToEmpty(event.resource().id());
            raw = event.eventType() + ":" + resourceId + ":" + email.templateKey() + ":" + nullToEmpty(email.recipient());
        }
        return "email:" + sha256(raw);
    }

    private String nullToEmpty(Object value) {
        return value == null ? "" : String.valueOf(value);
    }

    private String trimError(Exception exc) {
        var message = exc.getMessage() == null ? exc.getClass().getSimpleName() : exc.getMessage();
        return message.length() <= 1000 ? message : message.substring(0, 1000);
    }

    private String sha256(String value) {
        try {
            var digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exc) {
            throw new IllegalStateException("SHA-256 is not available", exc);
        }
    }
}
