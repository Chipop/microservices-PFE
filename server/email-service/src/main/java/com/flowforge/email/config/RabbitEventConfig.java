package com.flowforge.email.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Declarables;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.rabbit.config.SimpleRabbitListenerContainerFactory;
import org.springframework.amqp.rabbit.connection.CachingConnectionFactory;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

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
    Queue emailEventsQueue(EventConsumerProperties properties) {
        return new Queue(properties.queue(), true);
    }

    @Bean
    Declarables emailEventBindings(
            Queue emailEventsQueue,
            TopicExchange domainEventsExchange,
            EventConsumerProperties properties
    ) {
        var bindings = properties.routingKeys().stream()
                .map(routingKey -> BindingBuilder.bind(emailEventsQueue).to(domainEventsExchange).with(routingKey))
                .toList();
        return new Declarables(bindings.toArray(Binding[]::new));
    }

    @Bean
    MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    SimpleRabbitListenerContainerFactory rabbitListenerContainerFactory(
            ConnectionFactory connectionFactory,
            MessageConverter jsonMessageConverter
    ) {
        var factory = new SimpleRabbitListenerContainerFactory();
        factory.setConnectionFactory(connectionFactory);
        factory.setMessageConverter(jsonMessageConverter);
        factory.setDefaultRequeueRejected(false);
        return factory;
    }
}
