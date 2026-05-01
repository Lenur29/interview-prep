import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LoggerFactory } from '../logger/classes/logger-factory.js';
import { InjectLoggerFactory } from '../logger/logger.providers.js';
import { BaseHook } from './hooks.abstracts.js';
import { Logger } from '../logger/classes/logger.js';

@Injectable()
export class HooksService {
  private readonly logger: Logger;

  constructor(
    @InjectLoggerFactory() protected readonly loggerFactory: LoggerFactory,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.logger = this.loggerFactory.create({
      scope: this.constructor.name,
    });
  }

  /**
   * Run a hook and notify all subscribers.
   * This method will wait for all subscribers to complete their execution.
   *
   * @param hook The hook to run
   * @returns Promise that resolves when all subscribers have completed
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async runHook<T>(hook: BaseHook<T>): Promise<any> {
    this.logger.debug(`Running hook with ID: "${hook.id}"`, {
      payload: hook.payload,
    });

    return await this.eventEmitter.emitAsync(hook.id, hook);
  }
}
