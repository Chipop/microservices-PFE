package com.flowforge.workspace.model;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "workspaces")
public class Workspace {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 160)
    private String name;

    @Column(nullable = false)
    private String description = "";

    @Column(name = "owner_user_id", nullable = false)
    private Long ownerUserId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private WorkspaceVisibility visibility = WorkspaceVisibility.PRIVATE;

    @Column(name = "public_contributions_enabled", nullable = false)
    private boolean publicContributionsEnabled = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "workspace_type", nullable = false, length = 32)
    private WorkspaceType workspaceType = WorkspaceType.TEAM;

    @Column(name = "archived_at")
    private Instant archivedAt;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    @Column(name = "deleted_by_user_id")
    private Long deletedByUserId;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @PreUpdate
    void touch() {
        updatedAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description == null ? "" : description;
    }

    public Long getOwnerUserId() {
        return ownerUserId;
    }

    public void setOwnerUserId(Long ownerUserId) {
        this.ownerUserId = ownerUserId;
    }

    public Instant getArchivedAt() {
        return archivedAt;
    }

    public void setArchivedAt(Instant archivedAt) {
        this.archivedAt = archivedAt;
    }

    public WorkspaceVisibility getVisibility() {
        return visibility;
    }

    public void setVisibility(WorkspaceVisibility visibility) {
        this.visibility = visibility == null ? WorkspaceVisibility.PRIVATE : visibility;
    }

    public boolean isPublicContributionsEnabled() {
        return publicContributionsEnabled;
    }

    public void setPublicContributionsEnabled(boolean publicContributionsEnabled) {
        this.publicContributionsEnabled = publicContributionsEnabled;
    }

    public WorkspaceType getWorkspaceType() {
        return workspaceType;
    }

    public void setWorkspaceType(WorkspaceType workspaceType) {
        this.workspaceType = workspaceType == null ? WorkspaceType.TEAM : workspaceType;
    }

    public Instant getDeletedAt() {
        return deletedAt;
    }

    public void setDeletedAt(Instant deletedAt) {
        this.deletedAt = deletedAt;
    }

    public Long getDeletedByUserId() {
        return deletedByUserId;
    }

    public void setDeletedByUserId(Long deletedByUserId) {
        this.deletedByUserId = deletedByUserId;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
