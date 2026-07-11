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
import java.util.List;
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

    @Transactional(readOnly = true)
    public List<WorkspaceResponse> list(Long userId) {
        return workspaces.findAllForUser(userId).stream()
                .map(workspace -> toResponse(workspace, requireMember(workspace.getId(), userId).getRole()))
                .toList();
    }

    @Transactional
    public WorkspaceResponse create(Long userId, CreateWorkspaceRequest request) {
        var workspace = new Workspace();
        workspace.setName(request.name());
        workspace.setDescription(request.description());
        workspace.setOwnerUserId(userId);
        workspace = workspaces.save(workspace);

        var owner = new WorkspaceMember();
        owner.setWorkspace(workspace);
        owner.setUserId(userId);
        owner.setRole(WorkspaceRole.OWNER);
        members.save(owner);

        events.publish("WorkspaceCreated", workspace.getId(), userId);
        return toResponse(workspace, WorkspaceRole.OWNER);
    }

    @Transactional(readOnly = true)
    public WorkspaceResponse get(Long userId, Long workspaceId) {
        var workspace = visibleWorkspace(workspaceId, userId);
        return toResponse(workspace, requireMember(workspaceId, userId).getRole());
    }

    @Transactional
    public WorkspaceResponse update(Long userId, Long workspaceId, UpdateWorkspaceRequest request) {
        var workspace = visibleWorkspace(workspaceId, userId);
        rejectArchived(workspace);
        requireAdminOrOwner(workspaceId, userId);
        if (request.name() != null) workspace.setName(request.name());
        if (request.description() != null) workspace.setDescription(request.description());
        events.publish("WorkspaceUpdated", workspaceId, userId);
        return toResponse(workspace, requireMember(workspaceId, userId).getRole());
    }

    @Transactional
    public WorkspaceResponse archive(Long userId, Long workspaceId) {
        var workspace = visibleWorkspace(workspaceId, userId);
        requireOwner(workspaceId, userId);
        if (workspace.getArchivedAt() == null) {
            workspace.setArchivedAt(Instant.now());
            events.publish("WorkspaceUpdated", workspaceId, userId);
        }
        return toResponse(workspace, WorkspaceRole.OWNER);
    }

    @Transactional
    public void delete(Long userId, Long workspaceId) {
        var workspace = visibleWorkspace(workspaceId, userId);
        requireOwner(workspaceId, userId);
        workspaces.delete(workspace);
        events.publish("WorkspaceDeleted", workspaceId, userId);
    }

    @Transactional(readOnly = true)
    public List<MemberResponse> listMembers(Long userId, Long workspaceId) {
        visibleWorkspace(workspaceId, userId);
        return members.findByWorkspaceIdOrderByJoinedAtAsc(workspaceId).stream()
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
        events.publish("MemberRoleChanged", workspaceId, userId);
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
        members.delete(target);
        events.publish("MemberRemoved", workspaceId, userId);
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
        events.publish("MemberRoleChanged", workspaceId, userId);
        events.publish("WorkspaceUpdated", workspaceId, userId);
        return toResponse(workspace, WorkspaceRole.ADMIN);
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

        events.publish("MemberInvited", workspaceId, userId);
        return toInvitationResponse(invitation, token);
    }

    @Transactional
    public InvitationResponse acceptInvitation(Long userId, String token) {
        var invitation = pendingInvitation(token);
        var workspace = invitation.getWorkspace();
        rejectArchived(workspace);

        if (!members.existsByWorkspaceIdAndUserId(workspace.getId(), userId)) {
            var member = new WorkspaceMember();
            member.setWorkspace(workspace);
            member.setUserId(userId);
            member.setRole(invitation.getRole());
            members.save(member);
        }
        invitation.setInvitedUserId(userId);
        invitation.setStatus(InvitationStatus.ACCEPTED);
        invitation.setRespondedAt(Instant.now());
        events.publish("InvitationAccepted", workspace.getId(), userId);
        return toInvitationResponse(invitation, null);
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
        return members.findByWorkspaceIdAndUserId(workspaceId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Workspace not found"));
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

    private WorkspaceResponse toResponse(Workspace workspace, WorkspaceRole currentUserRole) {
        return new WorkspaceResponse(
                workspace.getId(),
                workspace.getName(),
                workspace.getDescription(),
                workspace.getOwnerUserId(),
                workspace.getArchivedAt(),
                workspace.getCreatedAt(),
                workspace.getUpdatedAt(),
                currentUserRole
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
