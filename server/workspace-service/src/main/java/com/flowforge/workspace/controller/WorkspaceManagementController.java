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
public class WorkspaceManagementController {
    private final WorkspaceService service;

    public WorkspaceManagementController(WorkspaceService service) {
        this.service = service;
    }

    @GetMapping({"", "/"})
    public List<WorkspaceResponse> list(@AuthenticationPrincipal Jwt jwt) {
        return service.list(userId(jwt));
    }

    @PostMapping({"", "/"})
    @ResponseStatus(HttpStatus.CREATED)
    public WorkspaceResponse create(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody CreateWorkspaceRequest request) {
        return service.create(userId(jwt), request);
    }

    @GetMapping("/{workspaceId}")
    public WorkspaceResponse get(@AuthenticationPrincipal Jwt jwt, @PathVariable Long workspaceId) {
        return service.get(userId(jwt), workspaceId);
    }

    @PatchMapping("/{workspaceId}")
    public WorkspaceResponse update(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long workspaceId,
            @Valid @RequestBody UpdateWorkspaceRequest request
    ) {
        return service.update(userId(jwt), workspaceId, request);
    }

    @PostMapping("/{workspaceId}/archive")
    public WorkspaceResponse archive(@AuthenticationPrincipal Jwt jwt, @PathVariable Long workspaceId) {
        return service.archive(userId(jwt), workspaceId);
    }

    @DeleteMapping("/{workspaceId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal Jwt jwt, @PathVariable Long workspaceId) {
        service.delete(userId(jwt), workspaceId);
    }

    @PostMapping("/{workspaceId}/transfer-ownership")
    public WorkspaceResponse transferOwnership(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long workspaceId,
            @Valid @RequestBody TransferOwnershipRequest request
    ) {
        return service.transferOwnership(userId(jwt), workspaceId, request);
    }

    private Long userId(Jwt jwt) {
        Object raw = jwt.getClaim("user_id");
        if (raw instanceof Number number) return number.longValue();
        return Long.parseLong(String.valueOf(raw));
    }
}
