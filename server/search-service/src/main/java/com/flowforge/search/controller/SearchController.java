package com.flowforge.search.controller;

import com.flowforge.search.dto.SearchResponse;
import com.flowforge.search.service.SearchQueryService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.List;

@RestController
@RequestMapping("/api/search")
public class SearchController {
    private final SearchQueryService search;

    public SearchController(SearchQueryService search) {
        this.search = search;
    }

    @GetMapping
    public SearchResponse global(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam String q,
            @RequestParam(required = false) String type,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return search.global(userId(jwt), q, parseTypes(type), page, size);
    }

    @GetMapping("/tasks")
    public SearchResponse tasks(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam String q,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String priority,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return search.tasks(userId(jwt), q, status, priority, page, size);
    }

    @GetMapping("/workspaces")
    public SearchResponse workspaces(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return search.workspaces(userId(jwt), q, page, size);
    }

    @GetMapping("/users")
    public SearchResponse users(
            @RequestParam String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return search.users(q, page, size);
    }

    @GetMapping("/comments")
    public SearchResponse comments(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return search.comments(userId(jwt), q, page, size);
    }

    private Long userId(Jwt jwt) {
        Object raw = jwt.getClaim("user_id");
        return raw instanceof Number number ? number.longValue() : Long.parseLong(String.valueOf(raw));
    }

    private List<String> parseTypes(String type) {
        if (type == null || type.isBlank()) return List.of();
        return Arrays.stream(type.split(","))
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .toList();
    }
}
