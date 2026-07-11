package com.flowforge.workspace.dto;

import com.flowforge.workspace.model.InvitationStatus;
import com.flowforge.workspace.model.WorkspaceRole;

import java.time.Instant;

public record InvitationResponse(
        Long id,
        Long workspaceId,
        String invitedEmail,
        Long invitedUserId,
        WorkspaceRole role,
        InvitationStatus status,
        Instant expiresAt,
        Instant respondedAt,
        Instant createdAt,
        String token
) {
}
