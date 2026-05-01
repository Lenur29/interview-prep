---
name: create-nestjs-config
description: Creates NestJS configuration files with environment validation using class-validator and @nestjs/config. Use when user asks to create config, add environment variables, or configure a new service/module.
---

# NestJS Config Generator

## File Structure

```
src/config/
├── index.ts           # Entry point that loads env and exports configs
├── s3.config.ts       # Example: S3 config
├── stripe.config.ts   # Example: Stripe config
└── {name}.config.ts   # New config file
```

> **Note:** `src/config/index.ts` is special - it loads environment variables before exporting configs. This is the only "barrel-like" file we keep because it has side effects.

## Template

```typescript
import { validateEnv } from '@/tools/validate-env.js';
import { registerAs } from '@nestjs/config';
import {
  IsEnum, IsNumber, IsOptional, IsString,
} from 'class-validator';

// Optional: import types/enums if needed
// import { SomeEnum } from '@/types/some-enum';

class {Name}EnvironmentVariables {
  @IsString()
  {PREFIX}_REQUIRED_STRING!: string;

  @IsOptional()
  @IsString()
  {PREFIX}_OPTIONAL_STRING?: string;

  @IsOptional()
  @IsNumber()
  {PREFIX}_OPTIONAL_NUMBER?: number;

  @IsOptional()
  @IsEnum(SomeEnum)
  {PREFIX}_OPTIONAL_ENUM?: SomeEnum;
}

export const {Name}Config = registerAs('{configKey}', () => {
  const env = validateEnv({Name}EnvironmentVariables);

  return {
    requiredString: env.{PREFIX}_REQUIRED_STRING,
    optionalString: env.{PREFIX}_OPTIONAL_STRING,
    optionalNumber: env.{PREFIX}_OPTIONAL_NUMBER ?? 3000,
    optionalEnum: env.{PREFIX}_OPTIONAL_ENUM || SomeEnum.DEFAULT,
    // Boolean from string: someBool: env.{PREFIX}_SOME_BOOL === 'true',
  };
});
```

## Workflow

1. Create `src/config/{name}.config.ts` using template
2. Add export to `src/config/index.ts`:
   ```typescript
   export { {Name}Config } from './{name}.config';
   ```
3. Config auto-loads via `ConfigModule.forRoot({ load: Object.values(configs) })`

## Naming Conventions

| Item | Convention | Example |
|------|------------|---------|
| File | `kebab-case.config.ts` | `stripe.config.ts` |
| Class | `{Name}EnvironmentVariables` | `StripeEnvironmentVariables` |
| Export | `{Name}Config` | `StripeConfig` |
| Config key | `camelCase` or `{Name}Config` | `'stripe'` or `'StripeConfig'` |
| Env vars | `SCREAMING_SNAKE_CASE` | `STRIPE_SECRET_KEY` |
| Return props | `camelCase` | `secretKey` |

## Validators Reference

```typescript
// Strings
@IsString()
VAR!: string;

// Numbers
@IsNumber()
VAR!: number;

// Booleans (stored as string in env)
@IsOptional()
@IsString()
VAR?: string;
// Usage: someBool: env.VAR === 'true'

// Enums
@IsEnum(MyEnum)
VAR!: MyEnum;

// Optional fields
@IsOptional()
@IsString()
VAR?: string;

// URLs
@IsUrl()
VAR!: string;

// Emails
@IsEmail()
VAR!: string;
```

## Usage in Services

```typescript
import { Inject } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { {Name}Config } from '@/config/{name}.config.js';

@Injectable()
export class SomeService {
  constructor(
    @Inject({Name}Config.KEY)
    private readonly config: ConfigType<typeof {Name}Config>,
  ) {}

  someMethod() {
    console.log(this.config.requiredString);
  }
}
```

## Example: Redis Config

```typescript
import { validateEnv } from '@/tools/validate-env.js';
import { registerAs } from '@nestjs/config';
import { IsNumber, IsOptional, IsString } from 'class-validator';

class RedisEnvironmentVariables {
  @IsString()
  REDIS_HOST!: string;

  @IsNumber()
  REDIS_PORT!: number;

  @IsOptional()
  @IsString()
  REDIS_PASSWORD?: string;

  @IsOptional()
  @IsNumber()
  REDIS_DB?: number;
}

export const RedisConfig = registerAs('redis', () => {
  const env = validateEnv(RedisEnvironmentVariables);

  return {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD,
    db: env.REDIS_DB ?? 0,
  };
});
```
