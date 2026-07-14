package com.flowforge.search.controller;

import com.flowforge.search.config.SearchProperties;
import com.flowforge.search.dto.ReindexResponse;
import com.flowforge.search.service.ReindexService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/search/internal")
public class InternalSearchController {
    private final SearchProperties properties;
    private final ReindexService reindexService;

    public InternalSearchController(SearchProperties properties, ReindexService reindexService) {
        this.properties = properties;
        this.reindexService = reindexService;
    }

    @PostMapping("/reindex")
    public ReindexResponse reindex(@RequestHeader("X-Internal-Key") String internalApiKey) {
        if (properties.internalApiKey() == null || properties.internalApiKey().isBlank()
                || !properties.internalApiKey().equals(internalApiKey)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Invalid internal API key.");
        }
        return reindexService.reindex(internalApiKey);
    }
}
