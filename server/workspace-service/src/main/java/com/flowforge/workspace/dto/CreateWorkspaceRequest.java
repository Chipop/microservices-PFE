package com.flowforge.workspace.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import com.flowforge.workspace.model.WorkspaceVisibility;

public record CreateWorkspaceRequest(
        @NotBlank @Size(max = 160) String name,
        @Size(max = 2000) String description,
        WorkspaceVisibility visibility,
        Boolean publicContributionsEnabled
) {
}
