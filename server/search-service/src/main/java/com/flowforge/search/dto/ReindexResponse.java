package com.flowforge.search.dto;

import java.util.Map;

public record ReindexResponse(
        Map<String, Long> indexed
) {
}
