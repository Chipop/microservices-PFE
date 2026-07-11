package com.flowforge.workspace.repository;

import com.flowforge.workspace.model.Workspace;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface WorkspaceRepository extends JpaRepository<Workspace, Long> {
    @Query("""
            select distinct w from Workspace w
            left join WorkspaceMember m on m.workspace = w and m.userId = :userId and m.removedAt is null
            where w.deletedAt is null
              and (m.id is not null or w.visibility = com.flowforge.workspace.model.WorkspaceVisibility.PUBLIC)
            order by w.createdAt desc
            """)
    List<Workspace> findAllForUser(@Param("userId") Long userId);

    @Query("""
            select w from Workspace w
            left join WorkspaceMember m on m.workspace = w and m.userId = :userId and m.removedAt is null
            where w.id = :workspaceId
              and w.deletedAt is null
              and (m.id is not null or w.visibility = com.flowforge.workspace.model.WorkspaceVisibility.PUBLIC)
            """)
    Optional<Workspace> findVisibleToUser(@Param("workspaceId") Long workspaceId, @Param("userId") Long userId);

    Optional<Workspace> findByOwnerUserIdAndWorkspaceTypeAndDeletedAtIsNull(
            Long ownerUserId,
            com.flowforge.workspace.model.WorkspaceType workspaceType
    );
}
