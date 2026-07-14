import json
import logging
import os
import uuid

import pika
from django.db import transaction
from django.utils import timezone

logger = logging.getLogger(__name__)

EXCHANGE_NAME = os.environ.get("RABBITMQ_EXCHANGE", "flowforge.events")
PRODUCER = "user-service"


def publish_domain_event(event_type, resource_type, resource_id, actor_user_id=None, data=None):
    payload = {
        "eventId": str(uuid.uuid4()),
        "eventType": event_type,
        "occurredAt": timezone.now().isoformat(),
        "producer": PRODUCER,
        "actorUserId": actor_user_id,
        "resource": {
            "type": resource_type,
            "id": resource_id,
        },
        "data": data or {},
    }

    def _publish():
        rabbitmq_url = os.environ.get("RABBITMQ_URL")
        if not rabbitmq_url:
            logger.debug("Skipping %s event publish because RABBITMQ_URL is not configured", event_type)
            return

        try:
            params = pika.URLParameters(rabbitmq_url)
            connection = pika.BlockingConnection(params)
            channel = connection.channel()
            channel.exchange_declare(exchange=EXCHANGE_NAME, exchange_type="topic", durable=True)
            channel.basic_publish(
                exchange=EXCHANGE_NAME,
                routing_key=event_type,
                body=json.dumps(payload, default=str).encode("utf-8"),
                properties=pika.BasicProperties(content_type="application/json", delivery_mode=2),
            )
            connection.close()
        except Exception:
            logger.exception("Failed to publish domain event %s", event_type)

    transaction.on_commit(_publish)
