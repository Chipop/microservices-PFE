package com.flowforge.workspace.controller;

import com.flowforge.workspace.dto.*;
import com.flowforge.workspace.service.WorkspaceService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/workspaces/{workspaceId}/members")
public class WorkspaceMemberController {
    private final WorkspaceService service;

    public WorkspaceMemberController(WorkspaceService service) {
        this.service = service;
    }

    @GetMapping({"", "/"})
    public MembersResponse members(@AuthenticationPrincipal Jwt jwt, @PathVariable Long workspaceId) {
        return new MembersResponse(service.listMembers(userId(jwt), workspaceId));
    }

    @PatchMapping("/{targetUserId}/role")
    public MemberResponse changeRole(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long workspaceId,
            @PathVariable Long targetUserId,
            @Valid @RequestBody ChangeRoleRequest request
    ) {
        return service.changeRole(userId(jwt), workspaceId, targetUserId, request);
    }

    @DeleteMapping("/{targetUserId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeMember(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long workspaceId,
            @PathVariable Long targetUserId
    ) {
        service.removeMember(userId(jwt), workspaceId, targetUserId);
    }

    private Long userId(Jwt jwt) {
        Object raw = jwt.getClaim("user_id");
        if (raw instanceof Number number) return number.longValue();
        return Long.parseLong(String.valueOf(raw));
    }
}
