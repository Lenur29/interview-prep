import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { type NestExpressApplication } from '@nestjs/platform-express';
import { type ConfigType } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import hbs from 'hbs';

import { AppModule } from './app.module.js';
import { AppConfig, FrontendConfig } from '@/config/index.js';
import { AppServer } from './enums/app-server.enum.js';
import { NestErrorFilter } from './errors/nest-error.filter.js';
import { LOGGER_FACTORY_PROVIDER, SYSTEM_LOGGER_PROVIDER } from './modules/logger/logger.constants.js';
import { type LoggerFactory } from './modules/logger/classes/logger-factory.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Starts the HTTP server with GraphQL playground
 */
async function startHttpServer(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    bodyParser: false,
  });

  app.useLogger(app.get(SYSTEM_LOGGER_PROVIDER));

  const { httpAdapter } = app.get(HttpAdapterHost);
  const loggerFactory = app.get<LoggerFactory>(LOGGER_FACTORY_PROVIDER);
  app.useGlobalFilters(new NestErrorFilter(httpAdapter, loggerFactory));

  app.use(cookieParser());

  const frontendConfig = app.get<ConfigType<typeof FrontendConfig>>(FrontendConfig.KEY);

  app.enableCors({
    origin: [
      frontendConfig.adminUrl,
      ...(frontendConfig.webappUrl ? [frontendConfig.webappUrl] : []),
    ],
    credentials: true,
  });

  app.useStaticAssets(path.resolve(__dirname, '../public'));
  app.setBaseViewsDir(path.resolve(__dirname, './resources/emails/'));

  await new Promise<void>((resolve, reject) => {
    hbs.registerPartials(
      path.resolve(__dirname, './resources/emails/partials/'),
      ((err: Error | null) => {
        if (err) reject(err);
        else resolve();
      }) as () => void,
    );
  });

  app.setViewEngine('hbs');

  const config = app.get<ConfigType<typeof AppConfig>>(AppConfig.KEY);

  await app.listen(config.port);

  const logger = loggerFactory.create({ scope: 'Main' });

  logger.info(`HTTP server started on port ${config.port}`);
  logger.info(`GraphQL playground: ${config.url}/graphql`);
}

/**
 * Starts the worker process
 */
async function startWorker(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    bufferLogs: true,
  });

  app.useLogger(app.get(SYSTEM_LOGGER_PROVIDER));

  const loggerFactory = app.get<LoggerFactory>(LOGGER_FACTORY_PROVIDER);
  const logger = loggerFactory.create({ scope: 'Main' });

  try {
    // await app.get(WorkersRunner).run();
  } catch (error) {
    if (error instanceof Error) {
      logger.error('Worker failed with error', error);
    }

    throw error;
  }
}

/**
 * Bootstrap function that starts the appropriate server based on APP_SERVER env
 */
async function bootstrap(): Promise<void> {
  const serverMode = process.env.APP_SERVER as AppServer | undefined;

  const runners: Record<AppServer, () => Promise<void>> = {
    [AppServer.HTTP]: startHttpServer,
    [AppServer.WORKER]: startWorker,
    [AppServer.WS]: async () => {
      throw new Error('WebSocket server mode is not implemented yet');
    },
  };

  const runner = runners[serverMode ?? AppServer.HTTP];

  await runner();
}

void bootstrap();
