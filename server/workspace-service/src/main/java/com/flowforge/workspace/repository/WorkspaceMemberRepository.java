package com.flowforge.workspace.repository;

import com.flowforge.workspace.model.WorkspaceMember;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface WorkspaceMemberRepository extends JpaRepository<WorkspaceMember, Long> {
    Optional<WorkspaceMember> findByWorkspaceIdAndUserIdAndRemovedAtIsNull(Long workspaceId, Long userId);

    Optional<WorkspaceMember> findByWorkspaceIdAndUserId(Long workspaceId, Long userId);

    List<WorkspaceMember> findByWorkspaceIdAndRemovedAtIsNullOrderByJoinedAtAsc(Long workspaceId);

    boolean existsByWorkspaceIdAndUserIdAndRemovedAtIsNull(Long workspaceId, Long userId);
}
