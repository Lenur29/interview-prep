import 'reflect-metadata';

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

const DEFAULT_PORT = 3000;
const logger = new Logger('Bootstrap');

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  const port = Number(process.env.PORT) || DEFAULT_PORT;
  await app.listen(port);

  logger.log(`API ready at http://localhost:${port}/graphql`);
}

bootstrap().catch((error: unknown) => {
  logger.error('Failed to bootstrap application', error);
  process.exit(1);
});
