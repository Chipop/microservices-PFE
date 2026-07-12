package com.flowforge.email.delivery;

public enum DeliveryStatus {
    PENDING,
    SENT,
    FAILED_RETRYABLE,
    FAILED_PERMANENT
}
