package com.flowforge.workspace.dto;

import com.flowforge.workspace.model.WorkspaceRole;

import java.time.Instant;

public record WorkspaceResponse(
        Long id,
        String name,
        String description,
        Long ownerUserId,
        Instant archivedAt,
        Instant createdAt,
        Instant updatedAt,
        WorkspaceRole currentUserRole
) {
}
