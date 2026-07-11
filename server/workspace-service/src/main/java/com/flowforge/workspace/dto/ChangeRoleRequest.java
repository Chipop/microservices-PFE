package com.flowforge.workspace.dto;

import com.flowforge.workspace.model.WorkspaceRole;
import jakarta.validation.constraints.NotNull;

public record ChangeRoleRequest(@NotNull WorkspaceRole role) {
}
