package com.flowforge.workspace.dto;

import com.flowforge.workspace.model.WorkspaceRole;

import java.time.Instant;

public record MemberResponse(
        Long id,
        Long userId,
        WorkspaceRole role,
        Instant joinedAt
) {
}
