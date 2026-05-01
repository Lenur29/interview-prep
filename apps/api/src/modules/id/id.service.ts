import { Inject, Injectable } from '@nestjs/common';
import { type ConfigType } from '@nestjs/config';
import { createRandomString } from '@pcg/text-kit';

import { AppConfig } from '@/config/app.config.js';
import { AppEnv } from '@/enums/app-env.enum.js';
import { generateEntityId } from '@/tools/generate-entity-id.js';

/**
 * An IdService is a service within your application that provides methods to generate unique IDs
 * for entities and other data objects.
 */
@Injectable()
export class IdService {
  constructor(
    @Inject(AppConfig.KEY) private readonly appConfig: ConfigType<typeof AppConfig>,
  ) {}

  /**
   * Returns a delimiter string based on the current environment.
   * This delimiter is used in constructing the entity IDs.
   * The delimiter is ':dev:' for development environments,
   * :stage:' for staging environments and ':' for other environments.
   *
   * This allows for better differentiation and traceability of entities across various environments.
   */
  get delimiter() {
    switch (this.appConfig.env) {
      case AppEnv.TEST:
        return ':test:';
      case AppEnv.DEVELOPMENT:
        return ':dev:';
      case AppEnv.STAGE:
        return ':stage:';
      default:
        return ':';
    }
  }

  /**
   * Generates unique id for entity
   * @param prefix - entity id prefix in database (e.g. 'u' for users)
   * @param app - app shortname (e.g. 'js')
   * @returns id in format 'jsu:xxxxxxxxxxx' or 'jsu:stage:xxxxxxxxxxx' for staging environment
   */
  generateEntityId(prefix: string, app?: string): string {
    return generateEntityId(app ?? this.appConfig.shortname, prefix, this.delimiter, 11);
  }

  /**
   * Generates unique id with length 11
   * @returns id in format 'xxxxxxxxxxx'
   */
  generateId(size?: number) {
    return createRandomString(size);
  }
}
