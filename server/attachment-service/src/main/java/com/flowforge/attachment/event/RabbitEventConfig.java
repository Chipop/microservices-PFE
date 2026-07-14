package com.flowforge.attachment.event;

import org.springframework.amqp.core.TopicExchange;
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
    TopicExchange domainEventsExchange(@Value("${events.exchange:flowforge.events}") String exchangeName) {
        return new TopicExchange(exchangeName, true, false);
    }

    @Bean
    MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }
}
