package com.flowforge.notification.config;

import org.springframework.amqp.core.AcknowledgeMode;
import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Declarables;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.rabbit.config.RetryInterceptorBuilder;
import org.springframework.amqp.rabbit.config.SimpleRabbitListenerContainerFactory;
import org.springframework.amqp.rabbit.connection.CachingConnectionFactory;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.retry.RepublishMessageRecoverer;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.retry.interceptor.RetryOperationsInterceptor;

import java.util.stream.Stream;

@Configuration
public class RabbitEventConfig {
    @Bean
    ConnectionFactory rabbitConnectionFactory(@Value("${rabbitmq.url}") String rabbitmqUrl) throws Exception {
        var factory = new com.rabbitmq.client.ConnectionFactory();
        factory.setUri(rabbitmqUrl);
        return new CachingConnectionFactory(factory);
    }

    @Bean
    TopicExchange domainEventsExchange(EventConsumerProperties properties) {
        return new TopicExchange(properties.exchange(), true, false);
    }

    @Bean
    DirectExchange notificationDeadLetterExchange(EventConsumerProperties properties) {
        return new DirectExchange(properties.deadLetterExchange(), true, false);
    }

    @Bean
    Queue notificationEventsQueue(EventConsumerProperties properties) {
        return QueueBuilder.durable(properties.queue())
                .deadLetterExchange(properties.deadLetterExchange())
                .deadLetterRoutingKey(properties.deadLetterRoutingKey())
                .build();
    }

    @Bean
    Queue notificationDeadLetterQueue(EventConsumerProperties properties) {
        return QueueBuilder.durable(properties.deadLetterQueue()).build();
    }

    @Bean
    Declarables notificationEventBindings(
            @Qualifier("notificationEventsQueue") Queue notificationEventsQueue,
            @Qualifier("notificationDeadLetterQueue") Queue notificationDeadLetterQueue,
            TopicExchange domainEventsExchange,
            DirectExchange notificationDeadLetterExchange,
            EventConsumerProperties properties
    ) {
        var mainBindings = properties.routingKeys().stream()
                .map(routingKey -> BindingBuilder.bind(notificationEventsQueue).to(domainEventsExchange).with(routingKey))
                .toList();
        var dlqBinding = BindingBuilder.bind(notificationDeadLetterQueue)
                .to(notificationDeadLetterExchange)
                .with(properties.deadLetterRoutingKey());
        return new Declarables(
                Stream.concat(mainBindings.stream(), Stream.of(dlqBinding))
                        .toArray(Binding[]::new)
        );
    }

    @Bean
    MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    RetryOperationsInterceptor notificationRetryInterceptor(
            RabbitTemplate rabbitTemplate,
            EventConsumerProperties properties
    ) {
        return RetryInterceptorBuilder.stateless()
                .maxAttempts(properties.maxAttempts())
                .backOffOptions(properties.retryBackoffMs(), 2.0, properties.retryBackoffMs() * 10)
                .recoverer(new RepublishMessageRecoverer(
                        rabbitTemplate,
                        properties.deadLetterExchange(),
                        properties.deadLetterRoutingKey()
                ))
                .build();
    }

    @Bean
    SimpleRabbitListenerContainerFactory rabbitListenerContainerFactory(
            ConnectionFactory connectionFactory,
            MessageConverter jsonMessageConverter,
            RetryOperationsInterceptor notificationRetryInterceptor
    ) {
        var factory = new SimpleRabbitListenerContainerFactory();
        factory.setConnectionFactory(connectionFactory);
        factory.setMessageConverter(jsonMessageConverter);
        factory.setAcknowledgeMode(AcknowledgeMode.AUTO);
        factory.setDefaultRequeueRejected(false);
        factory.setAdviceChain(notificationRetryInterceptor);
        return factory;
    }
}
