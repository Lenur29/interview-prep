import {
  type DynamicModule, Global, type LoggerService, Module,
} from '@nestjs/common';

import {
  type LoggerModuleAsyncOptions,
  type LoggerModuleOptions,
} from './logger.interfaces.js';
import {
  createLoggerAsyncProviders,
  createLoggerProviders,
  createNestLogger,
} from './logger.providers.js';

@Global()
@Module({})
export class LoggerModule {
  public static forRoot(options: LoggerModuleOptions): DynamicModule {
    const providers = createLoggerProviders(options);

    return {
      module: LoggerModule,
      providers: providers,
      exports: providers,
    };
  }

  public static forRootAsync(
    options: LoggerModuleAsyncOptions,
  ): DynamicModule {
    const providers = createLoggerAsyncProviders(options);

    return {
      module: LoggerModule,
      imports: options.imports,
      providers: providers,
      exports: providers,
    } as DynamicModule;
  }

  public static createLogger(options: LoggerModuleOptions): LoggerService {
    return createNestLogger(options);
  }
}
