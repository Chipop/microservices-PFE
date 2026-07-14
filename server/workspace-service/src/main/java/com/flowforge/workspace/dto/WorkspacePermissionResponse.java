package com.flowforge.workspace.dto;

import com.flowforge.workspace.model.WorkspaceRole;
import com.flowforge.workspace.model.WorkspaceVisibility;

public record WorkspacePermissionResponse(
        Long workspaceId,
        WorkspaceVisibility visibility,
        Boolean isMember,
        WorkspaceRole role,
        Boolean canView,
        Boolean canContribute,
        Boolean canAdmin
) {
}
