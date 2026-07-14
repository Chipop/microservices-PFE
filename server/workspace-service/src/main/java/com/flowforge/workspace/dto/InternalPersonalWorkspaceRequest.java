package com.flowforge.workspace.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record InternalPersonalWorkspaceRequest(
        @NotNull Long authUserId,
        @NotBlank @Size(max = 160) String username
) {
}
