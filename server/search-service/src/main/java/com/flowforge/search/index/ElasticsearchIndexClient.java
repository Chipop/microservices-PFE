package com.flowforge.search.index;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flowforge.search.config.SearchProperties;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.springframework.http.HttpStatus.BAD_GATEWAY;

@Component
public class ElasticsearchIndexClient {
    private static final Logger logger = LoggerFactory.getLogger(ElasticsearchIndexClient.class);

    private final RestClient client;
    private final ObjectMapper objectMapper;
    private final IndexNames indexNames;

    public ElasticsearchIndexClient(SearchProperties properties, ObjectMapper objectMapper, IndexNames indexNames) {
        this.client = RestClient.builder()
                .baseUrl(properties.elasticsearchUrl().replaceAll("/+$", ""))
                .build();
        this.objectMapper = objectMapper;
        this.indexNames = indexNames;
    }

    @PostConstruct
    void ensureIndices() {
        for (String index : indexNames.all()) {
            if (!exists(index)) {
                create(index);
            }
        }
    }

    public void index(String index, String id, Map<String, Object> document) {
        try {
            client.put()
                    .uri("/{index}/_doc/{id}", index, id)
                    .body(document)
                    .retrieve()
                    .toBodilessEntity();
        } catch (RuntimeException exc) {
            throw elasticFailure("Failed to index document " + id + " in " + index, exc);
        }
    }

    public void delete(String index, String id) {
        try {
            client.delete()
                    .uri("/{index}/_doc/{id}", index, id)
                    .retrieve()
                    .onStatus(HttpStatusCode::is4xxClientError, (request, response) -> {
                        if (response.getStatusCode().value() != 404) {
                            throw new ResponseStatusException(BAD_GATEWAY, "Elasticsearch delete failed");
                        }
                    })
                    .toBodilessEntity();
        } catch (RuntimeException exc) {
            throw elasticFailure("Failed to delete document " + id + " from " + index, exc);
        }
    }

    public void deleteByTerm(String index, String field, Object value) {
        try {
            client.post()
                    .uri("/{index}/_delete_by_query", index)
                    .body(Map.of(
                            "query", Map.of(
                                    "term", Map.of(field, value)
                            )
                    ))
                    .retrieve()
                    .toBodilessEntity();
        } catch (RuntimeException exc) {
            throw elasticFailure("Failed to delete documents from " + index + " by " + field, exc);
        }
    }

    public SearchHits search(List<String> indices, Map<String, Object> body) {
        try {
            JsonNode response = client.post()
                    .uri("/{indices}/_search", String.join(",", indices))
                    .body(body)
                    .retrieve()
                    .body(JsonNode.class);
            return parseHits(response);
        } catch (RuntimeException exc) {
            throw elasticFailure("Elasticsearch search failed", exc);
        }
    }

    private boolean exists(String index) {
        try {
            return client.head()
                    .uri("/{index}", index)
                    .exchange((request, response) -> response.getStatusCode().is2xxSuccessful());
        } catch (RuntimeException exc) {
            logger.warn("Could not check Elasticsearch index {}", index, exc);
            return false;
        }
    }

    private void create(String index) {
        var properties = new LinkedHashMap<String, Object>();
        properties.put("type", Map.of("type", "keyword"));
        properties.put("resourceId", Map.of("type", "long"));
        properties.put("title", Map.of("type", "text"));
        properties.put("description", Map.of("type", "text"));
        properties.put("body", Map.of("type", "text"));
        properties.put("username", Map.of("type", "text", "fields", Map.of("keyword", Map.of("type", "keyword"))));
        properties.put("status", Map.of("type", "keyword"));
        properties.put("priority", Map.of("type", "keyword"));
        properties.put("workspaceId", Map.of("type", "long"));
        properties.put("ownerUserId", Map.of("type", "long"));
        properties.put("authorUserId", Map.of("type", "long"));
        properties.put("viewerUserIds", Map.of("type", "long"));
        properties.put("memberUserIds", Map.of("type", "long"));
        properties.put("tags", Map.of("type", "keyword"));
        properties.put("updatedAt", Map.of("type", "date", "ignore_malformed", true));

        var body = Map.of(
                "settings", Map.of(
                        "number_of_shards", 1,
                        "number_of_replicas", 0
                ),
                "mappings", Map.of(
                        "dynamic", true,
                        "properties", properties
                )
        );
        try {
            client.put()
                    .uri("/{index}", index)
                    .body(body)
                    .retrieve()
                    .toBodilessEntity();
        } catch (RuntimeException exc) {
            throw elasticFailure("Failed to create Elasticsearch index " + index, exc);
        }
    }

    private SearchHits parseHits(JsonNode response) {
        var hits = new ArrayList<SearchHit>();
        JsonNode hitNodes = response.path("hits").path("hits");
        if (hitNodes.isArray()) {
            for (JsonNode hitNode : hitNodes) {
                @SuppressWarnings("unchecked")
                Map<String, Object> source = objectMapper.convertValue(hitNode.path("_source"), Map.class);
                hits.add(new SearchHit(
                        hitNode.path("_index").asText(),
                        hitNode.path("_id").asText(),
                        hitNode.path("_score").asDouble(0.0),
                        source == null ? Map.of() : source
                ));
            }
        }
        long total = response.path("hits").path("total").path("value").asLong(hits.size());
        return new SearchHits(total, hits);
    }

    private ResponseStatusException elasticFailure(String message, RuntimeException exc) {
        logger.warn(message, exc);
        return new ResponseStatusException(BAD_GATEWAY, message);
    }

    public record SearchHits(long total, List<SearchHit> hits) {
    }

    public record SearchHit(String index, String id, double score, Map<String, Object> source) {
    }
}
