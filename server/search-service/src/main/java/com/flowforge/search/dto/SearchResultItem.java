package com.flowforge.search.dto;

import java.util.Map;

public record SearchResultItem(
        String type,
        String id,
        String title,
        String snippet,
        double score,
        Map<String, Object> metadata
) {
}
