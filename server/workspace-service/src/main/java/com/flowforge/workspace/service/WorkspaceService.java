package com.flowforge.workspace.service;

import com.flowforge.workspace.config.WorkspaceProperties;
import com.flowforge.workspace.event.WorkspaceEventPublisher;
import com.flowforge.workspace.model.*;
import com.flowforge.workspace.repository.WorkspaceInvitationRepository;
import com.flowforge.workspace.repository.WorkspaceMemberRepository;
import com.flowforge.workspace.repository.WorkspaceRepository;
import com.flowforge.workspace.dto.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class WorkspaceService {
    private final WorkspaceRepository workspaces;
    private final WorkspaceMemberRepository members;
    private final WorkspaceInvitationRepository invitations;
    private final WorkspaceProperties properties;
    private final WorkspaceEventPublisher events;

    public WorkspaceService(
            WorkspaceRepository workspaces,
            WorkspaceMemberRepository members,
            WorkspaceInvitationRepository invitations,
            WorkspaceProperties properties,
            WorkspaceEventPublisher events
    ) {
        this.workspaces = workspaces;
        this.members = members;
        this.invitations = invitations;
        this.properties = properties;
        this.events = events;
    }

    @Transactional
    public List<WorkspaceResponse> list(Long userId) {
        ensurePersonalWorkspace(userId, "User " + userId);
        return workspaces.findAllForUser(userId).stream()
                .map(workspace -> toResponse(workspace, activeMember(workspace.getId(), userId).orElse(null)))
                .toList();
    }

    @Transactional
    public WorkspaceResponse create(Long userId, CreateWorkspaceRequest request) {
        var workspace = new Workspace();
        workspace.setName(request.name());
        workspace.setDescription(request.description());
        workspace.setOwnerUserId(userId);
        workspace.setVisibility(request.visibility());
        workspace.setPublicContributionsEnabled(Boolean.TRUE.equals(request.publicContributionsEnabled()));
        workspace.setWorkspaceType(WorkspaceType.TEAM);
        workspace = workspaces.save(workspace);

        var owner = new WorkspaceMember();
        owner.setWorkspace(workspace);
        owner.setUserId(userId);
        owner.setRole(WorkspaceRole.OWNER);
        members.save(owner);

        events.publish("workspace.created", "workspace", workspace.getId(), userId, searchableWorkspaceDocument(workspace));
        return toResponse(workspace, owner);
    }

    @Transactional(readOnly = true)
    public WorkspaceResponse get(Long userId, Long workspaceId) {
        var workspace = visibleWorkspace(workspaceId, userId);
        return toResponse(workspace, activeMember(workspaceId, userId).orElse(null));
    }

    @Transactional
    public WorkspaceResponse update(Long userId, Long workspaceId, UpdateWorkspaceRequest request) {
        var workspace = visibleWorkspace(workspaceId, userId);
        rejectArchived(workspace);
        requireAdminOrOwner(workspaceId, userId);
        if (request.name() != null) workspace.setName(request.name());
        if (request.description() != null) workspace.setDescription(request.description());
        if (request.visibility() != null) workspace.setVisibility(request.visibility());
        if (request.publicContributionsEnabled() != null) {
            workspace.setPublicContributionsEnabled(request.publicContributionsEnabled());
        }
        events.publish("workspace.updated", "workspace", workspaceId, userId, searchableWorkspaceDocument(workspace));
        return toResponse(workspace, requireMember(workspaceId, userId));
    }

    @Transactional
    public WorkspaceResponse archive(Long userId, Long workspaceId) {
        var workspace = visibleWorkspace(workspaceId, userId);
        requireOwner(workspaceId, userId);
        if (workspace.getArchivedAt() == null) {
            workspace.setArchivedAt(Instant.now());
        }
        return toResponse(workspace, requireMember(workspaceId, userId));
    }

    @Transactional
    public void delete(Long userId, Long workspaceId) {
        var workspace = visibleWorkspace(workspaceId, userId);
        requireOwner(workspaceId, userId);
        workspace.setDeletedAt(Instant.now());
        workspace.setDeletedByUserId(userId);
        events.publish("workspace.deleted", "workspace", workspaceId, userId, Map.of(
                "workspaceId", workspaceId
        ));
    }

    @Transactional(readOnly = true)
    public List<MemberResponse> listMembers(Long userId, Long workspaceId) {
        visibleWorkspace(workspaceId, userId);
        return members.findByWorkspaceIdAndRemovedAtIsNullOrderByJoinedAtAsc(workspaceId).stream()
                .map(this::toMemberResponse)
                .toList();
    }

    @Transactional
    public MemberResponse changeRole(Long userId, Long workspaceId, Long targetUserId, ChangeRoleRequest request) {
        var workspace = visibleWorkspace(workspaceId, userId);
        rejectArchived(workspace);
        requireAdminOrOwner(workspaceId, userId);
        if (request.role() == WorkspaceRole.OWNER) {
            throw badRequest("Use ownership transfer to assign OWNER.");
        }

        var target = requireMember(workspaceId, targetUserId);
        if (target.getRole() == WorkspaceRole.OWNER) {
            throw badRequest("Owner role cannot be changed here.");
        }
        target.setRole(request.role());
        events.publish("workspace.role_changed", "workspace", workspaceId, userId, Map.of(
                "workspaceId", workspaceId,
                "targetUserId", targetUserId,
                "role", request.role().name()
        ));
        publishWorkspaceAccessUpdated(workspace, userId);
        return toMemberResponse(target);
    }

    @Transactional
    public void removeMember(Long userId, Long workspaceId, Long targetUserId) {
        var workspace = visibleWorkspace(workspaceId, userId);
        rejectArchived(workspace);
        requireAdminOrOwner(workspaceId, userId);
        var target = requireMember(workspaceId, targetUserId);
        if (target.getRole() == WorkspaceRole.OWNER) {
            throw badRequest("Owner cannot be removed.");
        }
        target.setRemovedAt(Instant.now());
        target.setRemovedByUserId(userId);
        publishWorkspaceAccessUpdated(workspace, userId);
    }

    @Transactional
    public WorkspaceResponse transferOwnership(Long userId, Long workspaceId, TransferOwnershipRequest request) {
        var workspace = visibleWorkspace(workspaceId, userId);
        rejectArchived(workspace);
        var currentOwner = requireOwner(workspaceId, userId);
        var newOwner = requireMember(workspaceId, request.newOwnerUserId());

        currentOwner.setRole(WorkspaceRole.ADMIN);
        newOwner.setRole(WorkspaceRole.OWNER);
        workspace.setOwnerUserId(newOwner.getUserId());
        events.publish("workspace.role_changed", "workspace", workspaceId, userId, Map.of(
                "workspaceId", workspaceId,
                "targetUserId", currentOwner.getUserId(),
                "role", WorkspaceRole.ADMIN.name()
        ));
        events.publish("workspace.role_changed", "workspace", workspaceId, userId, Map.of(
                "workspaceId", workspaceId,
                "targetUserId", newOwner.getUserId(),
                "role", WorkspaceRole.OWNER.name()
        ));
        events.publish("workspace.updated", "workspace", workspaceId, userId, searchableWorkspaceDocument(workspace));
        publishWorkspaceAccessUpdated(workspace, userId);
        return toResponse(workspace, currentOwner);
    }

    @Transactional(readOnly = true)
    public List<InvitationResponse> listInvitations(Long userId, Long workspaceId) {
        visibleWorkspace(workspaceId, userId);
        requireAdminOrOwner(workspaceId, userId);
        return invitations.findByWorkspaceIdOrderByCreatedAtDesc(workspaceId).stream()
                .map(invitation -> toInvitationResponse(invitation, null))
                .toList();
    }

    @Transactional
    public InvitationResponse invite(Long userId, Long workspaceId, InviteMemberRequest request) {
        var workspace = visibleWorkspace(workspaceId, userId);
        rejectArchived(workspace);
        requireAdminOrOwner(workspaceId, userId);
        if (request.role() == WorkspaceRole.OWNER) {
            throw badRequest("Invite as ADMIN, MEMBER, or VIEWER. Transfer ownership later.");
        }

        var token = UUID.randomUUID() + "-" + UUID.randomUUID();
        var invitation = new WorkspaceInvitation();
        invitation.setWorkspace(workspace);
        invitation.setInvitedEmail(request.email().toLowerCase());
        invitation.setRole(request.role());
        invitation.setTokenHash(hash(token));
        invitation.setCreatedByUserId(userId);
        invitation.setExpiresAt(Instant.now().plus(properties.invitationTtlHours(), ChronoUnit.HOURS));
        invitation = invitations.save(invitation);

        events.publish("workspace.invitation", "invitation", invitation.getId(), userId, Map.of(
                "workspaceId", workspaceId,
                "invitationId", invitation.getId(),
                "invitedEmail", invitation.getInvitedEmail(),
                "role", invitation.getRole().name()
        ));
        return toInvitationResponse(invitation, token);
    }

    @Transactional
    public InvitationResponse acceptInvitation(Long userId, String token) {
        var invitation = pendingInvitation(token);
        var workspace = invitation.getWorkspace();
        rejectArchived(workspace);

        var existing = members.findByWorkspaceIdAndUserId(workspace.getId(), userId).orElse(null);
        if (existing == null) {
            var member = new WorkspaceMember();
            member.setWorkspace(workspace);
            member.setUserId(userId);
            member.setRole(invitation.getRole());
            members.save(member);
        } else if (existing.getRemovedAt() != null) {
            existing.setRemovedAt(null);
            existing.setRemovedByUserId(null);
            existing.setRole(invitation.getRole());
        }
        invitation.setInvitedUserId(userId);
        invitation.setStatus(InvitationStatus.ACCEPTED);
        invitation.setRespondedAt(Instant.now());
        publishWorkspaceAccessUpdated(workspace, userId);
        return toInvitationResponse(invitation, null);
    }

    @Transactional
    public WorkspaceResponse ensurePersonalWorkspace(Long userId, String username) {
        var workspace = ensurePersonalWorkspaceEntity(userId, username);
        return toResponse(workspace, requireMember(workspace.getId(), userId));
    }

    @Transactional(readOnly = true)
    public WorkspacePermissionResponse permissions(Long userId, Long workspaceId) {
        var workspace = visibleWorkspace(workspaceId, userId);
        var member = activeMember(workspaceId, userId).orElse(null);
        return toPermissionResponse(workspace, member);
    }

    public void validateInternalKey(String internalKey) {
        if (properties.internalApiKey() == null || properties.internalApiKey().isBlank()
                || !properties.internalApiKey().equals(internalKey)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Invalid internal key");
        }
    }

    @Transactional
    public InvitationResponse rejectInvitation(Long userId, String token) {
        var invitation = pendingInvitation(token);
        invitation.setInvitedUserId(userId);
        invitation.setStatus(InvitationStatus.REJECTED);
        invitation.setRespondedAt(Instant.now());
        return toInvitationResponse(invitation, null);
    }

    private Workspace visibleWorkspace(Long workspaceId, Long userId) {
        return workspaces.findVisibleToUser(workspaceId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Workspace not found"));
    }

    private WorkspaceMember requireMember(Long workspaceId, Long userId) {
        return members.findByWorkspaceIdAndUserIdAndRemovedAtIsNull(workspaceId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Workspace not found"));
    }

    private java.util.Optional<WorkspaceMember> activeMember(Long workspaceId, Long userId) {
        return members.findByWorkspaceIdAndUserIdAndRemovedAtIsNull(workspaceId, userId);
    }

    private WorkspaceMember requireOwner(Long workspaceId, Long userId) {
        var member = requireMember(workspaceId, userId);
        if (member.getRole() != WorkspaceRole.OWNER) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Workspace owner role required");
        }
        return member;
    }

    private void requireAdminOrOwner(Long workspaceId, Long userId) {
        var role = requireMember(workspaceId, userId).getRole();
        if (role != WorkspaceRole.OWNER && role != WorkspaceRole.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Workspace admin role required");
        }
    }

    private void rejectArchived(Workspace workspace) {
        if (workspace.getArchivedAt() != null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Workspace is archived");
        }
    }

    private WorkspaceInvitation pendingInvitation(String token) {
        var invitation = invitations.findByTokenHash(hash(token))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Invitation not found"));
        if (invitation.getStatus() != InvitationStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Invitation is not pending");
        }
        if (invitation.getExpiresAt().isBefore(Instant.now())) {
            invitation.setStatus(InvitationStatus.EXPIRED);
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Invitation is expired");
        }
        return invitation;
    }

    private Workspace ensurePersonalWorkspaceEntity(Long userId, String username) {
        var existing = workspaces.findByOwnerUserIdAndWorkspaceTypeAndDeletedAtIsNull(userId, WorkspaceType.PERSONAL);
        if (existing.isPresent()) {
            var workspace = existing.get();
            var member = members.findByWorkspaceIdAndUserId(workspace.getId(), userId).orElse(null);
            if (member == null) {
                member = new WorkspaceMember();
                member.setWorkspace(workspace);
                member.setUserId(userId);
                member.setRole(WorkspaceRole.OWNER);
                members.save(member);
            } else if (member.getRemovedAt() != null) {
                member.setRemovedAt(null);
                member.setRemovedByUserId(null);
                member.setRole(WorkspaceRole.OWNER);
            }
            return workspace;
        }

        var workspace = new Workspace();
        workspace.setName(username + "'s Workspace");
        workspace.setDescription("Personal workspace");
        workspace.setOwnerUserId(userId);
        workspace.setWorkspaceType(WorkspaceType.PERSONAL);
        workspace.setVisibility(WorkspaceVisibility.PRIVATE);
        workspace.setPublicContributionsEnabled(false);
        workspace = workspaces.save(workspace);

        var owner = new WorkspaceMember();
        owner.setWorkspace(workspace);
        owner.setUserId(userId);
        owner.setRole(WorkspaceRole.OWNER);
        members.save(owner);
        events.publish("workspace.created", "workspace", workspace.getId(), userId, searchableWorkspaceDocument(workspace));
        return workspace;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> searchSnapshots(int page, int size) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 200);
        var pageable = org.springframework.data.domain.PageRequest.of(safePage, safeSize);
        var rows = workspaces.findAll(pageable);
        return Map.of(
                "items", rows.stream()
                        .filter(workspace -> workspace.getDeletedAt() == null)
                        .map(this::searchableWorkspaceDocument)
                        .toList(),
                "hasNext", rows.hasNext()
        );
    }

    private WorkspaceResponse toResponse(Workspace workspace, WorkspaceMember member) {
        var permission = toPermissionResponse(workspace, member);
        return new WorkspaceResponse(
                workspace.getId(),
                workspace.getName(),
                workspace.getDescription(),
                workspace.getOwnerUserId(),
                workspace.getVisibility(),
                workspace.isPublicContributionsEnabled(),
                workspace.getWorkspaceType(),
                workspace.getArchivedAt(),
                workspace.getDeletedAt(),
                workspace.getCreatedAt(),
                workspace.getUpdatedAt(),
                member == null ? null : member.getRole(),
                permission.canView(),
                permission.canContribute(),
                permission.canAdmin()
        );
    }

    private void publishWorkspaceAccessUpdated(Workspace workspace, Long actorUserId) {
        events.publish("workspace.access_updated", "workspace", workspace.getId(), actorUserId, searchableWorkspaceDocument(workspace));
    }

    private Map<String, Object> searchableWorkspaceDocument(Workspace workspace) {
        var document = new LinkedHashMap<String, Object>();
        document.put("type", "workspace");
        document.put("workspaceId", workspace.getId());
        document.put("resourceId", workspace.getId());
        document.put("name", workspace.getName());
        document.put("title", workspace.getName());
        document.put("description", workspace.getDescription());
        document.put("ownerUserId", workspace.getOwnerUserId());
        document.put("visibility", workspace.getVisibility().name());
        document.put("workspaceType", workspace.getWorkspaceType().name());
        document.put("memberUserIds", members.findByWorkspaceIdAndRemovedAtIsNullOrderByJoinedAtAsc(workspace.getId()).stream()
                .map(WorkspaceMember::getUserId)
                .toList());
        document.put("updatedAt", workspace.getUpdatedAt());
        return document;
    }

    private WorkspacePermissionResponse toPermissionResponse(Workspace workspace, WorkspaceMember member) {
        var role = member == null ? null : member.getRole();
        var admin = role == WorkspaceRole.OWNER || role == WorkspaceRole.ADMIN;
        var memberCanContribute = role == WorkspaceRole.OWNER || role == WorkspaceRole.ADMIN || role == WorkspaceRole.MEMBER;
        var publicWorkspace = workspace.getVisibility() == WorkspaceVisibility.PUBLIC;
        var canView = member != null || publicWorkspace;
        var canContribute = admin || memberCanContribute || (publicWorkspace && workspace.isPublicContributionsEnabled());
        if (workspace.getArchivedAt() != null || workspace.getDeletedAt() != null) {
            canContribute = false;
        }
        return new WorkspacePermissionResponse(
                workspace.getId(),
                workspace.getVisibility(),
                member != null,
                role,
                canView,
                canContribute,
                admin
        );
    }

    private MemberResponse toMemberResponse(WorkspaceMember member) {
        return new MemberResponse(member.getId(), member.getUserId(), member.getRole(), member.getJoinedAt());
    }

    private InvitationResponse toInvitationResponse(WorkspaceInvitation invitation, String token) {
        return new InvitationResponse(
                invitation.getId(),
                invitation.getWorkspace().getId(),
                invitation.getInvitedEmail(),
                invitation.getInvitedUserId(),
                invitation.getRole(),
                invitation.getStatus(),
                invitation.getExpiresAt(),
                invitation.getRespondedAt(),
                invitation.getCreatedAt(),
                token
        );
    }

    private ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }

    private String hash(String token) {
        try {
            var digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exc) {
            throw new IllegalStateException("SHA-256 is not available", exc);
        }
    }
}
