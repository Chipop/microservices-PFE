package com.flowforge.workspace.repository;

import com.flowforge.workspace.model.WorkspaceInvitation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface WorkspaceInvitationRepository extends JpaRepository<WorkspaceInvitation, Long> {
    List<WorkspaceInvitation> findByWorkspaceIdOrderByCreatedAtDesc(Long workspaceId);

    Optional<WorkspaceInvitation> findByTokenHash(String tokenHash);
}
