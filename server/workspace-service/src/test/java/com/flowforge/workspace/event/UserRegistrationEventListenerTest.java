package com.flowforge.workspace.event;

import com.flowforge.workspace.service.WorkspaceService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class UserRegistrationEventListenerTest {
    @Mock
    private WorkspaceService workspaceService;

    @InjectMocks
    private UserRegistrationEventListener listener;

    @Test
    void provisionsPersonalWorkspaceFromUserRegisteredEvent() {
        var event = new DomainEvent(
                "event-1",
                "user.registered",
                "2026-07-12T00:00:00Z",
                "auth-service",
                42L,
                new DomainEvent.Resource("user", 42L),
                Map.of("username", "alice", "email", "alice@example.com")
        );

        listener.consume(event);

        verify(workspaceService).ensurePersonalWorkspace(42L, "alice");
    }

    @Test
    void ignoresOtherEvents() {
        var event = new DomainEvent(
                "event-2",
                "user.profile.created",
                "2026-07-12T00:00:00Z",
                "user-service",
                42L,
                new DomainEvent.Resource("user", 42L),
                Map.of()
        );

        listener.consume(event);

        verify(workspaceService, never()).ensurePersonalWorkspace(42L, "alice");
    }

    @Test
    void rejectsMissingUsernameSoMessageCanBeRetriedOrDeadLettered() {
        var event = new DomainEvent(
                "event-3",
                "user.registered",
                "2026-07-12T00:00:00Z",
                "auth-service",
                42L,
                new DomainEvent.Resource("user", 42L),
                Map.of("email", "alice@example.com")
        );

        assertThatThrownBy(() -> listener.consume(event))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("username");
    }
}
