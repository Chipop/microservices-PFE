package com.flowforge.search.service;

import com.flowforge.search.dto.SearchResponse;
import com.flowforge.search.dto.SearchResultItem;
import com.flowforge.search.index.ElasticsearchIndexClient;
import com.flowforge.search.index.IndexNames;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class SearchQueryService {
    private static final int MAX_SIZE = 50;

    private final ElasticsearchIndexClient elasticsearch;
    private final IndexNames indexNames;

    public SearchQueryService(ElasticsearchIndexClient elasticsearch, IndexNames indexNames) {
        this.elasticsearch = elasticsearch;
        this.indexNames = indexNames;
    }

    public SearchResponse global(Long userId, String query, List<String> types, int page, int size) {
        var indices = types == null || types.isEmpty()
                ? indexNames.all()
                : types.stream().map(indexNames::indexForType).toList();
        return search(userId, query, indices, null, null, page, size);
    }

    public SearchResponse tasks(Long userId, String query, String status, String priority, int page, int size) {
        return search(userId, query, List.of(indexNames.tasks()), status, priority, page, size);
    }

    public SearchResponse workspaces(Long userId, String query, int page, int size) {
        return search(userId, query, List.of(indexNames.workspaces()), null, null, page, size);
    }

    public SearchResponse users(String query, int page, int size) {
        return search(null, query, List.of(indexNames.users()), null, null, page, size);
    }

    public SearchResponse comments(Long userId, String query, int page, int size) {
        return search(userId, query, List.of(indexNames.comments()), null, null, page, size);
    }

    private SearchResponse search(
            Long userId,
            String query,
            List<String> indices,
            String status,
            String priority,
            int page,
            int size
    ) {
        String q = validate(query);
        int safePage = Math.max(page, 0);
        int safeSize = Math.max(1, Math.min(size, MAX_SIZE));
        var filters = new ArrayList<Map<String, Object>>();

        if (userId != null) {
            filters.add(Map.of(
                    "bool", Map.of(
                            "should", List.of(
                                    Map.of("term", Map.of("viewerUserIds", userId)),
                                    Map.of("term", Map.of("memberUserIds", userId)),
                                    Map.of("term", Map.of("ownerUserId", userId)),
                                    Map.of("term", Map.of("authorUserId", userId)),
                                    Map.of("term", Map.of("type", "user")),
                                    Map.of("term", Map.of("visibility", "PUBLIC"))
                            ),
                            "minimum_should_match", 1
                    )
            ));
        }
        if (status != null && !status.isBlank()) {
            filters.add(Map.of("term", Map.of("status", status.trim().toLowerCase())));
        }
        if (priority != null && !priority.isBlank()) {
            filters.add(Map.of("term", Map.of("priority", priority.trim().toLowerCase())));
        }

        var body = Map.of(
                "from", safePage * safeSize,
                "size", safeSize,
                "query", Map.of(
                        "bool", Map.of(
                                "must", List.of(Map.of(
                                        "multi_match", Map.of(
                                                "query", q,
                                                "fields", List.of("title^4", "username^4", "name^4", "description^2", "body^2", "biography", "tags"),
                                                "type", "best_fields",
                                                "operator", "and"
                                        )
                                )),
                                "filter", filters
                        )
                )
        );

        var hits = elasticsearch.search(indices, body);
        var results = hits.hits().stream()
                .map(hit -> toResult(indexNames.typeForIndex(hit.index()), hit))
                .toList();
        return new SearchResponse(q, safePage, safeSize, hits.total(), results);
    }

    private String validate(String query) {
        if (query == null || query.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Query parameter q is required.");
        }
        String q = query.trim();
        if (q.length() > 200) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Query parameter q must be at most 200 characters.");
        }
        return q;
    }

    private SearchResultItem toResult(String type, ElasticsearchIndexClient.SearchHit hit) {
        var source = hit.source();
        String title = stringValue(firstPresent(source, "title", "name", "username"));
        String snippet = snippet(stringValue(firstPresent(source, "description", "body", "biography")));
        var metadata = new LinkedHashMap<>(source);
        metadata.remove("description");
        metadata.remove("body");
        metadata.remove("biography");
        return new SearchResultItem(type, hit.id(), title, snippet, hit.score(), metadata);
    }

    private Object firstPresent(Map<String, Object> source, String... keys) {
        for (String key : keys) {
            if (source.containsKey(key)) return source.get(key);
        }
        return "";
    }

    private String stringValue(Object raw) {
        return raw == null ? "" : String.valueOf(raw);
    }

    private String snippet(String raw) {
        if (raw.length() <= 180) return raw;
        return raw.substring(0, 177) + "...";
    }
}
