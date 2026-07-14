import json
import logging
import os
import time

import pika
from django.core.management.base import BaseCommand

from profiles.services import provision_profile_from_user_registered

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Consume RabbitMQ domain events for user-service projections."

    def handle(self, *args, **options):
        rabbitmq_url = os.environ.get("RABBITMQ_URL")
        if not rabbitmq_url:
            self.stdout.write("RABBITMQ_URL is not configured; user-service event consumer is disabled.")
            return

        exchange = os.environ.get("RABBITMQ_EXCHANGE", "flowforge.events")
        queue = os.environ.get("USER_EVENTS_QUEUE", "user-service.events")
        dlx = os.environ.get("USER_EVENTS_DLX", "user-service.events.dlx")
        dlq = os.environ.get("USER_EVENTS_DLQ", "user-service.events.dlq")
        dlq_routing_key = os.environ.get("USER_EVENTS_DLQ_ROUTING_KEY", "user-service.events.failed")
        max_attempts = int(os.environ.get("USER_EVENTS_MAX_ATTEMPTS", "3"))
        retry_backoff_ms = int(os.environ.get("USER_EVENTS_RETRY_BACKOFF_MS", "1000"))

        params = pika.URLParameters(rabbitmq_url)
        connection = pika.BlockingConnection(params)
        channel = connection.channel()
        channel.exchange_declare(exchange=exchange, exchange_type="topic", durable=True)
        channel.exchange_declare(exchange=dlx, exchange_type="direct", durable=True)
        channel.queue_declare(
            queue=queue,
            durable=True,
            arguments={
                "x-dead-letter-exchange": dlx,
                "x-dead-letter-routing-key": dlq_routing_key,
            },
        )
        channel.queue_declare(queue=dlq, durable=True)
        channel.queue_bind(queue=queue, exchange=exchange, routing_key="user.registered")
        channel.queue_bind(queue=dlq, exchange=dlx, routing_key=dlq_routing_key)
        channel.basic_qos(prefetch_count=1)

        self.stdout.write(f"Consuming user-service events from {queue}.")

        def on_message(ch, method, properties, body):
            try:
                event = json.loads(body.decode("utf-8"))
            except Exception:
                logger.exception("Failed to decode user-service event")
                ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
                return

            for attempt in range(1, max_attempts + 1):
                try:
                    self._handle_event(event)
                    ch.basic_ack(delivery_tag=method.delivery_tag)
                    return
                except Exception:
                    logger.exception("Failed to consume user-service event on attempt %s", attempt)
                    if attempt < max_attempts:
                        time.sleep(max(0, retry_backoff_ms) / 1000)
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

        channel.basic_consume(queue=queue, on_message_callback=on_message)
        channel.start_consuming()

    def _handle_event(self, event):
        if event.get("eventType") != "user.registered":
            logger.debug("Ignoring user-service event %s", event.get("eventType"))
            return
        provision_profile_from_user_registered(event)
