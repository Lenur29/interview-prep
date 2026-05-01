import { MiddlewareConsumer, Module, ModuleMetadata, RequestMethod } from '@nestjs/common';
import { CacheModule } from './modules/cache/cache.module.js';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as configs from './config/index.js';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { LOGGER_FACTORY_PROVIDER, LOGGER_PROVIDER } from './modules/logger/logger.constants.js';
import { LoggerFactory } from './modules/logger/classes/logger-factory.js';
import { LoggerModule } from './modules/logger/logger.module.js';
import { CurrentUserModule } from './modules/current-user/current-user.module.js';
import { Logger } from './modules/logger/classes/logger.js';
import { GraphQLModule } from '@nestjs/graphql';
import { createGraphQLErrorFormatter } from './apollo/error-formatter.js';
import { createGraphQLContext } from './apollo/context.js';
import { IdModule } from './modules/id/id.module.js';
import { PostgresPubSubModule } from './modules/postgres-pubsub/index.js';
import { RawBodyMiddleware } from './middlewares/raw-body.middleware.js';
import { JsonBodyMiddleware } from './middlewares/json-body.middleware.js';
import { EventEmitterModule } from '@nestjs/event-emitter';

import {
  ApolloServerPluginLandingPageLocalDefault,
  ApolloServerPluginLandingPageProductionDefault,
} from '@apollo/server/plugin/landingPage/default';
import { AppEnv } from './enums/app-env.enum.js';
import { AppServer } from './enums/app-server.enum.js';
import { UsersModule } from './modules/users/users.module.js';
import { ImagesModule } from './modules/images/images.module.js';
import { MailerModule } from './modules/mailer/mailer.module.js';
import { BinaryFilesModule } from './modules/binary-files/binary-files.module.js';

import { AuthModule } from './modules/auth/auth.module.js';
import { CookieModule } from './modules/auth/cookie/cookie.module.js';
import { SessionsModule } from './modules/auth/sessions/sessions.module.js';
import { HooksModule } from './modules/hooks/hooks.module.js';
import { RolesModule } from './modules/roles/roles.module.js';
import { UserRolesModule } from './modules/user-roles/user-roles.module.js';
import { FirebaseModule } from './modules/firebase/firebase.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';
import { S3MultipartModule } from './modules/s3-multipart/s3-multipart.module.js';

/*
 * Global modules that are always loaded regardless of APP_SERVER mode
 */
const globalImports: ModuleMetadata['imports'] = [
  CacheModule,
  ConfigModule.forRoot({
    isGlobal: true,
    load: Object.values(configs),
  }),
  ScheduleModule.forRoot(),
  LoggerModule.forRootAsync({
    inject: [configs.LoggerConfig.KEY],
    useFactory: (opts: ConfigType<typeof configs.LoggerConfig>) => opts,
  }),
  TypeOrmModule.forRootAsync({
    useFactory: (dbConfig: ConfigType<typeof configs.DbConfig>, loggerFactory: LoggerFactory) => ({
      ...dbConfig,
      logger: loggerFactory.createTypeOrmLogger({
        enabled: true,
      }),
    }),
    inject: [configs.DbConfig.KEY, LOGGER_FACTORY_PROVIDER],
  }),
  EventEmitterModule.forRoot(),
  MailerModule,
  CurrentUserModule,
  IdModule,
  PostgresPubSubModule,
  HooksModule,
  CookieModule,
  SessionsModule,
];

/**
 * HTTP-specific modules loaded only when APP_SERVER = HTTP
 */
const httpImports: ModuleMetadata['imports'] = [
  GraphQLModule.forRootAsync<ApolloDriverConfig>({
    inject: [LOGGER_PROVIDER],
    driver: ApolloDriver,
    useFactory: (logger: Logger) => {
      // TODO: fix any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const plugins: any[] = [];
      if (process.env.APP_ENV === AppEnv.LOCAL) {
        plugins.push(
          ApolloServerPluginLandingPageLocalDefault({
            embed: true,
          }),
        );
      } else {
        plugins.push(ApolloServerPluginLandingPageProductionDefault());
      }

      return {
        subscriptions: {
          'graphql-ws': true,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        context: (ctx: any) => {
          return createGraphQLContext({
            req: ctx.req,

            res: ctx.res,

            connectionParams: ctx.connectionParams,
          });
        },
        formatError: createGraphQLErrorFormatter({
          logger,
        }),
        playground: false,
        autoSchemaFile: true,
        introspection: process.env.APP_ENV === AppEnv.LOCAL,
        plugins,
      };
    },
  }),
  ImagesModule,
  UsersModule,
  AuthModule,
  BinaryFilesModule,
  RolesModule,
  UserRolesModule,
  FirebaseModule,
  NotificationsModule,
  S3MultipartModule,
];

/**
 * Worker-specific modules loaded only when APP_SERVER = WORKER
 */
const workerImports: ModuleMetadata['imports'] = [];

/**
 * Build the imports array based on APP_SERVER mode
 */
const imports: ModuleMetadata['imports'] = [...globalImports];

if (process.env.APP_SERVER === AppServer.WORKER) {
  imports.push(...workerImports);
} else {
  // Default to HTTP mode
  imports.push(...httpImports);

  // PlaywrightModule for E2E test authentication (only in local environment)
  // Uses dynamic import to avoid loading devDependencies (@faker-js/faker) in production
  if (process.env.APP_ENV === AppEnv.LOCAL) {
    const { PlaywrightModule } = await import('./modules/playwright/playwright.module.js');
    imports.push(PlaywrightModule);
  }
}

@Module({
  imports,
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RawBodyMiddleware)
      .forRoutes({
        path: '/stripe/webhook',
        method: RequestMethod.POST,
      })
      .apply(JsonBodyMiddleware)
      .forRoutes('*');
  }
}
