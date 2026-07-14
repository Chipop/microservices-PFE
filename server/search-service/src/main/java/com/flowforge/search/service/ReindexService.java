package com.flowforge.search.service;

import com.flowforge.search.config.SearchProperties;
import com.flowforge.search.dto.ReindexResponse;
import com.flowforge.search.index.IndexNames;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class ReindexService {
    private static final Logger logger = LoggerFactory.getLogger(ReindexService.class);

    private final SearchProperties properties;
    private final SearchIndexService indexService;
    private final IndexNames indexNames;

    public ReindexService(SearchProperties properties, SearchIndexService indexService, IndexNames indexNames) {
        this.properties = properties;
        this.indexService = indexService;
        this.indexNames = indexNames;
    }

    public ReindexResponse reindex(String internalApiKey) {
        var counts = new LinkedHashMap<String, Long>();
        counts.put("tasks", reindexSource(properties.source().taskServiceBaseUrl(), "/api/tasks/internal/search-snapshots", internalApiKey, indexNames.tasks()));
        counts.put("comments", reindexSource(properties.source().commentServiceBaseUrl(), "/api/comments/internal/search-snapshots", internalApiKey, indexNames.comments()));
        counts.put("workspaces", reindexSource(properties.source().workspaceServiceBaseUrl(), "/api/workspaces/internal/search-snapshots", internalApiKey, indexNames.workspaces()));
        counts.put("categories", reindexSource(properties.source().projectServiceBaseUrl(), "/api/categories/internal/search-snapshots", internalApiKey, indexNames.projects()));
        counts.put("users", reindexSource(properties.source().userServiceBaseUrl(), "/api/profiles/internal/search-snapshots/", internalApiKey, indexNames.users()));
        return new ReindexResponse(counts);
    }

    private long reindexSource(String baseUrl, String path, String internalApiKey, String index) {
        var client = RestClient.builder().baseUrl(baseUrl.replaceAll("/+$", "")).build();
        long indexed = 0;
        int page = 0;
        while (true) {
            SnapshotPage response;
            try {
                int currentPage = page;
                response = client.get()
                        .uri(uri -> uri.path(path).queryParam("page", currentPage).queryParam("size", 200).build())
                        .header("X-Internal-Key", internalApiKey)
                        .retrieve()
                        .body(SnapshotPage.class);
            } catch (RuntimeException exc) {
                logger.warn("Skipping reindex source {}{} because it is unavailable", baseUrl, path, exc);
                return indexed;
            }
            if (response == null || response.items() == null || response.items().isEmpty()) {
                return indexed;
            }
            for (Map<String, Object> item : response.items()) {
                Object id = item.get("resourceId");
                if (id == null) id = item.get("id");
                if (id == null) continue;
                indexService.upsert(index, String.valueOf(id), item);
                indexed++;
            }
            if (!response.hasNext()) {
                return indexed;
            }
            page++;
        }
    }

    public record SnapshotPage(List<Map<String, Object>> items, boolean hasNext) {
    }
}
