import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import { randomUUID } from 'crypto';

interface DomainEventResource {
  type: string;
  id: number;
}

interface PublishDomainEventInput {
  eventType: string;
  actorUserId?: number | null;
  resource: DomainEventResource;
  data?: Record<string, unknown>;
}

@Injectable()
export class DomainEventPublisher implements OnModuleDestroy {
  private readonly logger = new Logger(DomainEventPublisher.name);
  private readonly exchangeName: string;
  private connection?: any;
  private channel?: any;

  constructor(private readonly config: ConfigService) {
    this.exchangeName = this.config.get<string>('RABBITMQ_EXCHANGE', 'flowforge.events');
  }

  async publish(input: PublishDomainEventInput): Promise<void> {
    const rabbitmqUrl = this.config.get<string>('RABBITMQ_URL');
    if (!rabbitmqUrl) {
      this.logger.debug(`Skipping ${input.eventType} event publish because RABBITMQ_URL is not configured`);
      return;
    }

    const payload = {
      eventId: randomUUID(),
      eventType: input.eventType,
      occurredAt: new Date().toISOString(),
      producer: 'task-service',
      actorUserId: input.actorUserId ?? null,
      resource: input.resource,
      data: input.data ?? {},
    };

    try {
      const channel = await this.getChannel(rabbitmqUrl);
      await channel.publish(
        this.exchangeName,
        input.eventType,
        Buffer.from(JSON.stringify(payload)),
        {
          contentType: 'application/json',
          persistent: true,
        },
      );
    } catch (error) {
      this.logger.error(`Failed to publish domain event ${input.eventType}`, error instanceof Error ? error.stack : String(error));
      await this.close();
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.close();
  }

  private async getChannel(rabbitmqUrl: string): Promise<any> {
    if (this.channel) return this.channel;

    this.connection = await amqp.connect(rabbitmqUrl);
    this.channel = await this.connection.createChannel();
    await this.channel.assertExchange(this.exchangeName, 'topic', { durable: true });
    return this.channel;
  }

  private async close(): Promise<void> {
    const channel = this.channel;
    const connection = this.connection;
    this.channel = undefined;
    this.connection = undefined;

    try {
      await channel?.close();
    } catch {
      // Ignore close errors after a publish failure.
    }
    try {
      await connection?.close();
    } catch {
      // Ignore close errors after a publish failure.
    }
  }
}
