package com.flowforge.email.delivery;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface EmailDeliveryRepository extends JpaRepository<EmailDelivery, Long> {
    Optional<EmailDelivery> findByIdempotencyKey(String idempotencyKey);
}
