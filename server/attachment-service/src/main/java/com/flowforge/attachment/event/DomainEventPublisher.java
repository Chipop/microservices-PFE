package com.flowforge.attachment.event;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.AmqpException;
import org.springframework.amqp.core.AmqpTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Component
public class DomainEventPublisher {
    private static final Logger logger = LoggerFactory.getLogger(DomainEventPublisher.class);

    private final AmqpTemplate amqpTemplate;
    private final String exchangeName;

    public DomainEventPublisher(
            AmqpTemplate amqpTemplate,
            @Value("${events.exchange:flowforge.events}") String exchangeName
    ) {
        this.amqpTemplate = amqpTemplate;
        this.exchangeName = exchangeName;
    }

    public void publish(String eventType, String resourceType, Long resourceId, Long actorUserId, Map<String, Object> data) {
        var payload = Map.of(
                "eventId", UUID.randomUUID().toString(),
                "eventType", eventType,
                "occurredAt", Instant.now().toString(),
                "producer", "attachment-service",
                "actorUserId", actorUserId,
                "resource", Map.of("type", resourceType, "id", resourceId),
                "data", data == null ? Map.of() : data
        );

        Runnable publish = () -> {
            try {
                amqpTemplate.convertAndSend(exchangeName, eventType, payload);
            } catch (AmqpException exc) {
                logger.warn("Failed to publish domain event {}", eventType, exc);
            }
        };

        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    publish.run();
                }
            });
        } else {
            publish.run();
        }
    }
}
