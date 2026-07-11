package com.flowforge.workspace.repository;

import com.flowforge.workspace.model.Workspace;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface WorkspaceRepository extends JpaRepository<Workspace, Long> {
    @Query("""
            select w from Workspace w
            join WorkspaceMember m on m.workspace = w
            where m.userId = :userId
            order by w.createdAt desc
            """)
    List<Workspace> findAllForUser(@Param("userId") Long userId);

    @Query("""
            select w from Workspace w
            join WorkspaceMember m on m.workspace = w
            where w.id = :workspaceId and m.userId = :userId
            """)
    Optional<Workspace> findVisibleToUser(@Param("workspaceId") Long workspaceId, @Param("userId") Long userId);
}
