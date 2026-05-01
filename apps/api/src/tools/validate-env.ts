import { type Type as ClassConstructor } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

/**
 * Validate environment variables using class-validator
 *
 * @param cls - class with environment variables
 * @throws Error if validation fails
 * @returns validated config as typed object
 * @example
 * ```ts
 * export class AppConfigEnvironmentVariables {
 *  @Type(() => Number)
 *  @IsNumber()
 *  PORT = 3000;
 * }
 *
 * const env = validateEnv(AppConfigEnvironmentVariables); // typed object
 * // env.PORT is now a number
 * ```
 */
export const validateEnv = <T>(cls: ClassConstructor<T>): T => {
  const validatedConfig = plainToInstance(
    cls,
    process.env,
    {
      enableImplicitConversion: true,
    },
  );

  const errors = validateSync(validatedConfig as unknown as object, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return validatedConfig;
};
