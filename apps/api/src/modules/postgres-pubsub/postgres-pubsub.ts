/* eslint-disable @typescript-eslint/no-explicit-any */

import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { InjectDataSource } from '@nestjs/typeorm';
import { EventEmitter } from 'events';
import { PubSubEngine } from 'graphql-subscriptions';
import {
  Client, ClientConfig, Notification, escapeIdentifier, escapeLiteral,
} from 'pg';
import {
  BaseEntity, DataSource, FindOptionsWhere,
} from 'typeorm';

import { isObject, MaybeNull } from '@pcg/predicates';

import { type ConfigType } from '@nestjs/config';
import { InjectLoggerFactory } from '../logger/logger.providers.js';
import { LoggerFactory } from '../logger/classes/logger-factory.js';
import { DbConfig } from '@/config/db.config.js';
import { wait } from '@/tools/wait.js';
import { Logger } from '../logger/classes/logger.js';

export type PubSubSubscriptionCallback = (...args: unknown[]) => void;

export interface PubSubSubscription {
  id: number;
  channel: string;
  callback: PubSubSubscriptionCallback;
}

/**
 * Entity reference
 * @example
 * {
 *  __ref: 'Media#jsv:12jg839hkvgs'
 * }
 */
export interface EntityRef {
  __ref: string;
}

export interface EntityWithId extends BaseEntity {
  id: string;
}

export interface ObjectWithId {
  id: string;
}

@Injectable()
export class PostgresPubSub extends PubSubEngine implements OnModuleInit {
  private readonly logger: Logger;

  private dbClient!: Client;
  private ee = new EventEmitter();
  private subscriptions: PubSubSubscription[] = [];

  private config!: ClientConfig;
  private readonly retryLimit = 5;
  private isReinitializing = false;

  constructor(
    @Inject(DbConfig.KEY) private readonly dbConfig: ConfigType<typeof DbConfig>,
    @InjectLoggerFactory() private readonly loggerFactory: LoggerFactory,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {
    super();

    this.logger = this.loggerFactory.create({
      scope: this.constructor.name,
    });
  }

  async onModuleInit() {
    this.config = {
      host: this.dbConfig.host,
      port: this.dbConfig.port,
      database: this.dbConfig.database,
      user: this.dbConfig.username,
      password: this.dbConfig.password,
      ssl: this.dbConfig.ssl as boolean | undefined,

      // Pool configuration
      connectionTimeoutMillis: 30000, // 30 seconds to establish connection

      // Query timeout settings
      query_timeout: 30000, // 30 seconds for queries to complete
      statement_timeout: 30000, // 30 seconds for statements

      // Automatic reconnection
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000, // Start keep-alive after 10 seconds
    };

    await this.reinit();
  }

  // @see fix suggestion [here](https://community.fly.io/t/postgresql-connection-issues-have-returned/6424/6)
  @Interval('KEEP_DB_CONNECTION_ALIVE', 5 * 1000) // each 5s
  async keepDbConnectionAlive() {
    if (this.isReinitializing) {
      return;
    }

    try {
      await this.dbClient.query('SELECT pg_backend_pid()');
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error('PubSub PostgreSQL connection check failed:', error);
      }

      await this.reinit();
    }
  }

  private async reinit() {
    this.isReinitializing = true;

    this.logger.info('Initializing PubSub PostgreSQL client...');

    if (this.dbClient) {
      this.dbClient.removeAllListeners();
      this.dbClient.once('error', (error) => {
        this.logger.error(`Previous DB client errored after reconnecting already:`, error);
      });
      void this.dbClient.end();
    }

    this.dbClient = await this.reconnect();

    this.logger.info('PubSub PostgreSQL client connected');

    this.addDbClientEventListeners();

    this.isReinitializing = false;
  }

  private addDbClientEventListeners() {
    this.dbClient.on('notification', (message: Notification) => {
      void this.processNotification(message);
    });

    this.dbClient.on('end', () => {
      this.logger.warn('PubSub PostgreSQL client ended');
      if (!this.isReinitializing) {
        void this.reinit();
      }
    });

    this.dbClient.on('error', (error: Error) => {
      this.logger.error('PubSub PostgreSQL client error', error);

      if (!this.isReinitializing) {
        void this.reinit();
      }
    });
  }

  private async reconnect() {
    this.logger.info('Connecting to PubSub PostgreSQL for notification streaming');
    const startTime = Date.now();
    const retryTimeout = 3000;

    for (let attempt = 1; attempt < this.retryLimit; attempt++) {
      this.logger.info(`PostgreSQL connection attempt #${String(attempt)}...`);

      try {
        const dbClient = new Client(this.config);
        const connecting = new Promise((resolve, reject) => {
          dbClient.once('connect', resolve);
          dbClient.once('end', () => {
            reject(Error('Connection ended.'));
          });
          dbClient.once('error', reject);
        });
        await Promise.all([
          dbClient.connect(),
          connecting,
        ]);
        this.logger.info('PostgreSQL connection succeeded');

        return dbClient;
      } catch (error) {
        if (error instanceof Error) {
          this.logger.error('PostgreSQL connection attempt failed:', error);
        }
        await wait(500);

        if ((Date.now() - startTime) > retryTimeout) {
          throw new Error(`Stopping PostgreSQL connection attempts after ${String(retryTimeout)}ms timeout has been reached.`);
        }
      }
    }

    throw new Error('Reconnecting notification client to PostgreSQL database failed.');
  }

  public async publish(triggerName: string, payload: any, retryCount = 1): Promise<void> {
    if (!payload) {
      throw new Error('Payload is required argument');
    }

    const channel: string = escapeIdentifier(triggerName);

    const message: string = escapeLiteral(JSON.stringify(this.minify(payload)));

    this.logger.debug('Publishing PostgreSQL notification', {
      channel,
      message,
      payload,
    });

    try {
      await this.dbClient.query(`NOTIFY ${channel}, ${message}`);
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Can't publish PostgreSQL notification to channel "${channel}"`, error, {
          payload,
        });

        if (/connection/i.exec(error.message)) {
          if (retryCount < 3) {
            this.logger.error(`Try to reconnect to PubSub PostgreSQL Client...(Retry count: ${String(retryCount)})`);
            await this.dbClient.end();
            await this.dbClient.connect();
            await this.publish(triggerName, payload, retryCount + 1);
          }
        }
      }
    }

    await Promise.resolve();
  }

  public async subscribe(triggerName: string, callback: PubSubSubscriptionCallback): Promise<number> {
    if (!this.subscriptions.some((s) => s.channel === triggerName)) {
      const channel: string = escapeIdentifier(triggerName);
      await this.dbClient.query(`LISTEN ${channel}`);
    }

    this.ee.on(triggerName, callback);

    const subId = Math.floor(Math.random() * 100000);

    this.subscriptions.push({
      id: subId,
      channel: triggerName,
      callback,
    });

    return await Promise.resolve(subId);
  }

  public async unsubscribe(subId: number) {
    const index = this.subscriptions.findIndex((s) => s.id === subId);
    if (index !== -1) {
      const subscription = this.subscriptions[index];
      this.subscriptions.splice(index, 1);
      this.ee.removeListener(subscription.channel, subscription.callback);

      if (!this.subscriptions.some((s) => s.channel === subscription.channel)) {
        const channel: string = escapeIdentifier(subscription.channel);
        await this.dbClient.query(`UNLISTEN ${channel}`);
      }
    }
  }

  private async processNotification(message: Notification) {
    try {
      const minifiedPayload = JSON.parse(message.payload ?? '');

      if (minifiedPayload.id) {
        if (Object.keys(minifiedPayload).length === 1) {
          this.ee.emit(message.channel, minifiedPayload);
        } else {
          this.ee.emit(message.channel, await this.unminify(minifiedPayload));
        }
      } else if (Array.isArray(minifiedPayload)) {
        const payload = await this.unminify(minifiedPayload);

        this.ee.emit(message.channel, payload);
      } else {
        const payload: any = {
        };
        for (const [key, value] of Object.entries(minifiedPayload)) {
          payload[key] = await this.unminify(value);
        }

        this.ee.emit(message.channel, payload);
      }
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Can't extract PostgreSQL notificaton from channel ${message.channel}`, error, {
          message,
        });
      }
    }
  }

  private toRef(object: object): MaybeNull<EntityRef> {
    if (this.isEntityWithId(object)) {
      return {
        __ref: `${object.constructor.name}#${object.id}`,
      };
    }

    return null;
  }

  private minify(payload: any): any {
    if (Array.isArray(payload)) {
      return payload.map((item) => this.minify(item));
    }

    if (!isObject(payload)) {
      return payload;
    }

    if (this.isEntityWithId(payload)) {
      const ref = this.toRef(payload);

      return (ref ?? payload);
    }

    const minifiedObject: Record<string, unknown> = {
    };

    for (const key of Object.keys(payload)) {
      const value = payload[key];

      if (value instanceof Date) {
        minifiedObject[key] = value.toISOString();
      } else if (Array.isArray(value)) {
        minifiedObject[key] = value.map((item) => this.minify(item));
      } else if (isObject(value)) {
        minifiedObject[key] = this.minify(value);
      } else {
        minifiedObject[key] = value;
      }
    }

    return minifiedObject;
  }

  private async unref(entityRef: EntityRef): Promise<BaseEntity | ObjectWithId> {
    const logger = this.logger.child({
      action: this.unref.name,
      entityRef,
    });

    logger.debug('Unref entity');

    const [entityName, id] = entityRef.__ref.split('#');

    if (!entityName || !id) {
      logger.error(`Invalid ref ${entityRef.__ref}`);

      return {
        id: entityRef.__ref,
      };
    }

    const entityMetadata = this.dataSource.entityMetadatas.find(
      (entityMetadata) => entityMetadata.name === entityName,
    );

    if (!entityMetadata?.target) {
      logger.error(`Entity ${entityName} not found in registry`);

      return {
        id,
      };
    }

    const instance = await this.dataSource.getRepository(entityMetadata.target).findOneBy({
      id,
    } as FindOptionsWhere<EntityWithId>);

    if (!instance) {
      logger.error(`Entity ${entityName} with id ${id} not found in database`);

      return {
        id,
      };
    }

    logger.debug('Entity unrefed successfully', {
      instance,
    });

    return instance as BaseEntity;
  }

  private async unminify(payload: any): Promise<any> {
    this.logger.debug('Unminifying payload', {
      payload,
      isEntityRef: this.isEntityRef(payload),
    });

    if (Array.isArray(payload)) {
      return await Promise.all(payload.map((item) => this.unminify(item)));
    }

    if (this.isEntityRef(payload)) {
      return await this.unref(payload);
    }

    if (!isObject(payload)) {
      return payload;
    }

    const unminifiedObject: Record<string, unknown> = {
    };

    for (const key of Object.keys(payload)) {
      const value = payload[key];

      if (typeof value === 'string' && !isNaN(Date.parse(value))) {
        unminifiedObject[key] = new Date(value);
      } else if (this.isEntityRef(value)) {
        unminifiedObject[key] = await this.unref(value);
      } else if (Array.isArray(value)) {
        unminifiedObject[key] = await Promise.all(value.map((item) => this.unminify(item)));
      } else if (isObject(value)) {
        unminifiedObject[key] = await this.unminify(value);
      } else {
        unminifiedObject[key] = value;
      }
    }

    return unminifiedObject;
  }

  private isEntityRef(value: unknown): value is EntityRef {
    return typeof value === 'object' && value !== null && '__ref' in value;
  }

  private isEntityWithId(value: unknown): value is EntityWithId {
    return value instanceof BaseEntity && 'id' in value;
  }

  public asyncIterator<T>(triggers: string | readonly string[]) {
    return super.asyncIterableIterator(triggers) as AsyncIterator<T>;
  }
}
