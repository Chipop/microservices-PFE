package com.flowforge.notification.controller;

import com.flowforge.notification.dto.NotificationResponse;
import com.flowforge.notification.dto.ReadAllResponse;
import com.flowforge.notification.dto.UnreadCountResponse;
import com.flowforge.notification.service.NotificationService;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {
    private final NotificationService service;

    public NotificationController(NotificationService service) {
        this.service = service;
    }

    @GetMapping
    public Page<NotificationResponse> list(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size
    ) {
        return service.list(userId(jwt), page, size);
    }

    @GetMapping("/unread-count")
    public UnreadCountResponse unreadCount(@AuthenticationPrincipal Jwt jwt) {
        return service.unreadCount(userId(jwt));
    }

    @PatchMapping("/{notificationId}/read")
    public NotificationResponse markRead(@AuthenticationPrincipal Jwt jwt, @PathVariable Long notificationId) {
        return service.markRead(userId(jwt), notificationId);
    }

    @PatchMapping("/read-all")
    public ReadAllResponse markAllRead(@AuthenticationPrincipal Jwt jwt) {
        return service.markAllRead(userId(jwt));
    }

    @DeleteMapping("/{notificationId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal Jwt jwt, @PathVariable Long notificationId) {
        service.delete(userId(jwt), notificationId);
    }

    private Long userId(Jwt jwt) {
        Object raw = jwt.getClaim("user_id");
        if (raw == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token has no user_id claim");
        }
        try {
            return Long.valueOf(raw.toString());
        } catch (NumberFormatException exc) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token has invalid user_id claim");
        }
    }
}
