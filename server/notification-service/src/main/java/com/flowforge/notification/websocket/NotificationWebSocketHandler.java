package com.flowforge.notification.websocket;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class NotificationWebSocketHandler extends TextWebSocketHandler {
    private static final Logger logger = LoggerFactory.getLogger(NotificationWebSocketHandler.class);
    private static final String USER_ID_ATTRIBUTE = "userId";

    private final JwtDecoder jwtDecoder;
    private final ObjectMapper objectMapper;
    private final ConcurrentHashMap<Long, Set<WebSocketSession>> sessionsByUser = new ConcurrentHashMap<>();

    public NotificationWebSocketHandler(JwtDecoder jwtDecoder, ObjectMapper objectMapper) {
        this.jwtDecoder = jwtDecoder;
        this.objectMapper = objectMapper;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        var userId = authenticate(session);
        if (userId == null) {
            session.close(CloseStatus.NOT_ACCEPTABLE.withReason("Missing or invalid access token"));
            return;
        }

        session.getAttributes().put(USER_ID_ATTRIBUTE, userId);
        sessionsByUser.computeIfAbsent(userId, ignored -> ConcurrentHashMap.newKeySet()).add(session);
        session.sendMessage(new TextMessage(objectMapper.writeValueAsString(new WebSocketEvent("notifications.connected", null))));
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        remove(session);
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) {
        logger.debug("Notification websocket transport error", exception);
        remove(session);
    }

    public void send(Long userId, Object payload) {
        var sessions = sessionsByUser.get(userId);
        if (sessions == null || sessions.isEmpty()) {
            return;
        }

        for (var session : sessions) {
            try {
                if (session.isOpen()) {
                    synchronized (session) {
                        if (session.isOpen()) {
                            session.sendMessage(new TextMessage(objectMapper.writeValueAsString(payload)));
                        }
                    }
                } else {
                    remove(session);
                }
            } catch (IOException exc) {
                logger.warn("Failed to send notification websocket payload to user {}", userId, exc);
                remove(session);
            }
        }
    }

    private Long authenticate(WebSocketSession session) {
        try {
            var uri = session.getUri();
            if (uri == null) {
                return null;
            }
            var token = UriComponentsBuilder.fromUri(uri)
                    .build()
                    .getQueryParams()
                    .getFirst("access_token");
            if (token == null || token.isBlank()) {
                return null;
            }
            var jwt = jwtDecoder.decode(token);
            var rawUserId = jwt.getClaim("user_id");
            return rawUserId == null ? null : Long.valueOf(rawUserId.toString());
        } catch (RuntimeException exc) {
            return null;
        }
    }

    private void remove(WebSocketSession session) {
        var rawUserId = session.getAttributes().get(USER_ID_ATTRIBUTE);
        if (!(rawUserId instanceof Long userId)) {
            return;
        }
        var sessions = sessionsByUser.get(userId);
        if (sessions != null) {
            sessions.remove(session);
            if (sessions.isEmpty()) {
                sessionsByUser.remove(userId, sessions);
            }
        }
    }

    public record WebSocketEvent(String type, Object payload) {
    }
}
