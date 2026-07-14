package com.flowforge.search.event;

import com.flowforge.search.service.SearchIndexService;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Component;

@Component
public class SearchEventListener {
    private final SearchIndexService indexService;

    public SearchEventListener(SearchIndexService indexService) {
        this.indexService = indexService;
    }

    @RabbitListener(queues = "${events.queue}")
    public void consume(@Payload DomainEvent event) {
        indexService.apply(event);
    }
}
