package com.flowforge.workspace.repository;

import com.flowforge.workspace.model.WorkspaceMember;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface WorkspaceMemberRepository extends JpaRepository<WorkspaceMember, Long> {
    Optional<WorkspaceMember> findByWorkspaceIdAndUserId(Long workspaceId, Long userId);

    List<WorkspaceMember> findByWorkspaceIdOrderByJoinedAtAsc(Long workspaceId);

    boolean existsByWorkspaceIdAndUserId(Long workspaceId, Long userId);
}
