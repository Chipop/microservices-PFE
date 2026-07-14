package com.flowforge.email.event;

import com.flowforge.email.mail.EmailDeliveryService;
import com.flowforge.email.template.EmailTemplateRenderer;
import com.flowforge.email.template.RenderedEmail;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Component;

@Component
public class EmailEventListener {
    private static final Logger logger = LoggerFactory.getLogger(EmailEventListener.class);

    private final EmailTemplateRenderer renderer;
    private final EmailDeliveryService deliveryService;

    public EmailEventListener(EmailTemplateRenderer renderer, EmailDeliveryService deliveryService) {
        this.renderer = renderer;
        this.deliveryService = deliveryService;
    }

    @RabbitListener(queues = "${events.queue}")
    public void consume(@Payload DomainEvent event) {
        if (event.eventType() == null || event.eventType().isBlank()) {
            logger.warn("Skipping email event without eventType");
            return;
        }

        RenderedEmail email = renderer.render(event);
        deliveryService.deliver(event, email);
    }
}
