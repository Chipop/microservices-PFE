package com.flowforge.search.index;

import com.flowforge.search.config.SearchProperties;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class IndexNames {
    private final String prefix;

    public IndexNames(SearchProperties properties) {
        this.prefix = properties.indexPrefix();
    }

    public String tasks() {
        return prefix + "_tasks";
    }

    public String workspaces() {
        return prefix + "_workspaces";
    }

    public String projects() {
        return prefix + "_projects";
    }

    public String users() {
        return prefix + "_users";
    }

    public String comments() {
        return prefix + "_comments";
    }

    public List<String> all() {
        return List.of(tasks(), workspaces(), projects(), users(), comments());
    }

    public String indexForType(String type) {
        return switch (type) {
            case "task" -> tasks();
            case "workspace" -> workspaces();
            case "project", "category" -> projects();
            case "user" -> users();
            case "comment" -> comments();
            default -> throw new IllegalArgumentException("Unsupported search type: " + type);
        };
    }

    public String typeForIndex(String index) {
        if (index.equals(tasks())) return "task";
        if (index.equals(workspaces())) return "workspace";
        if (index.equals(projects())) return "project";
        if (index.equals(users())) return "user";
        if (index.equals(comments())) return "comment";
        return "unknown";
    }
}
