package com.flowforge.workspace.dto;

import com.flowforge.workspace.model.WorkspaceRole;
import com.flowforge.workspace.model.WorkspaceType;
import com.flowforge.workspace.model.WorkspaceVisibility;

import java.time.Instant;

public record WorkspaceResponse(
        Long id,
        String name,
        String description,
        Long ownerUserId,
        WorkspaceVisibility visibility,
        Boolean publicContributionsEnabled,
        WorkspaceType workspaceType,
        Instant archivedAt,
        Instant deletedAt,
        Instant createdAt,
        Instant updatedAt,
        WorkspaceRole currentUserRole,
        Boolean canView,
        Boolean canContribute,
        Boolean canAdmin
) {
}
