package com.flowforge.search.service;

import com.flowforge.search.event.DomainEvent;
import com.flowforge.search.index.ElasticsearchIndexClient;
import com.flowforge.search.index.IndexNames;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class SearchIndexService {
    private static final Logger logger = LoggerFactory.getLogger(SearchIndexService.class);

    private final ElasticsearchIndexClient elasticsearch;
    private final IndexNames indexNames;
    private final EventDocumentMapper mapper;

    public SearchIndexService(
            ElasticsearchIndexClient elasticsearch,
            IndexNames indexNames,
            EventDocumentMapper mapper
    ) {
        this.elasticsearch = elasticsearch;
        this.indexNames = indexNames;
        this.mapper = mapper;
    }

    public void apply(DomainEvent event) {
        if (event.eventType() == null || event.eventType().isBlank()) {
            logger.warn("Skipping search event without eventType");
            return;
        }

        switch (event.eventType()) {
            case "task.created", "task.updated" -> upsert(indexNames.tasks(), id(event), mapper.taskDocument(event));
            case "task.deleted" -> {
                delete(indexNames.tasks(), id(event));
                Object taskId = event.data() == null ? null : event.data().get("taskId");
                if (taskId != null) {
                    elasticsearch.deleteByTerm(indexNames.comments(), "taskId", taskId);
                }
            }
            case "task.comment.created", "task.comment.updated" -> upsert(indexNames.comments(), id(event), mapper.commentDocument(event));
            case "task.comment.deleted" -> delete(indexNames.comments(), id(event));
            case "workspace.created", "workspace.updated", "workspace.access_updated" ->
                    upsert(indexNames.workspaces(), id(event), mapper.workspaceDocument(event));
            case "workspace.deleted" -> delete(indexNames.workspaces(), id(event));
            case "user.profile.created", "user.profile.updated" -> upsert(indexNames.users(), id(event), mapper.userDocument(event));
            default -> logger.debug("Ignoring unsupported search event {}", event.eventType());
        }
    }

    public void upsert(String index, String id, Map<String, Object> document) {
        elasticsearch.index(index, id, document);
    }

    public void delete(String index, String id) {
        elasticsearch.delete(index, id);
    }

    private String id(DomainEvent event) {
        Long id = event.resource() == null ? null : event.resource().id();
        if (id == null && event.data() != null) {
            Object candidate = event.data().get("taskId");
            if (candidate == null) candidate = event.data().get("workspaceId");
            if (candidate == null) candidate = event.data().get("authUserId");
            if (candidate == null) candidate = event.data().get("commentId");
            if (candidate != null) return String.valueOf(candidate);
        }
        return String.valueOf(id);
    }
}
