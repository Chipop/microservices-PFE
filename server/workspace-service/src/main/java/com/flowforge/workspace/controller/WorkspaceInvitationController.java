package com.flowforge.workspace.controller;

import com.flowforge.workspace.dto.*;
import com.flowforge.workspace.service.WorkspaceService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/workspaces")
public class WorkspaceInvitationController {
    private final WorkspaceService service;

    public WorkspaceInvitationController(WorkspaceService service) {
        this.service = service;
    }

    @GetMapping("/{workspaceId}/invitations")
    public List<InvitationResponse> listInvitations(@AuthenticationPrincipal Jwt jwt, @PathVariable Long workspaceId) {
        return service.listInvitations(userId(jwt), workspaceId);
    }

    @PostMapping("/{workspaceId}/invitations")
    @ResponseStatus(HttpStatus.CREATED)
    public InvitationResponse invite(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long workspaceId,
            @Valid @RequestBody InviteMemberRequest request
    ) {
        return service.invite(userId(jwt), workspaceId, request);
    }

    @PostMapping("/invitations/{token}/accept")
    public InvitationResponse accept(@AuthenticationPrincipal Jwt jwt, @PathVariable String token) {
        return service.acceptInvitation(userId(jwt), token);
    }

    @PostMapping("/invitations/{token}/reject")
    public InvitationResponse reject(@AuthenticationPrincipal Jwt jwt, @PathVariable String token) {
        return service.rejectInvitation(userId(jwt), token);
    }

    private Long userId(Jwt jwt) {
        Object raw = jwt.getClaim("user_id");
        if (raw instanceof Number number) return number.longValue();
        return Long.parseLong(String.valueOf(raw));
    }
}
