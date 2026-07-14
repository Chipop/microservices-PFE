package com.flowforge.search.dto;

import java.util.List;

public record SearchResponse(
        String query,
        int page,
        int size,
        long total,
        List<SearchResultItem> results
) {
}
