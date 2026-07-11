package com.flowforge.workspace.dto;

import jakarta.validation.constraints.Size;

public record UpdateWorkspaceRequest(
        @Size(max = 160) String name,
        @Size(max = 2000) String description
) {
}
