package com.flowforge.notification.service;

import com.flowforge.notification.dto.NotificationResponse;

public record NotificationCreation(NotificationResponse notification, boolean created) {
}
