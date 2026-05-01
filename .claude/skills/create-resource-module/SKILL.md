---
name: create-resource-module
description: Create a complete NestJS resource module with entity, service, resolver, types, permissions, and ID prefix. Use when creating new API resources, entities, or CRUD modules. Triggers on "generate resource module" requests.
---

# Generate NestJS Resource Module

This skill create a complete NestJS resource module following the project architecture standard.

## Generation Progress Checklist

Copy this checklist and track your progress as you generate the module:

```markdown
Resource Module Generation Progress:
- [ ] Step 1: Gather requirements (name, ID prefix, fields, relations, status)
- [ ] Step 2: Create types/common.ts (if status needed)
- [ ] Step 3: Create types/resolver/ files
  - [ ] create-{resource}.ts
  - [ ] update-{resource}.ts
  - [ ] delete-{resource}.ts
  - [ ] {resources}.ts
  - [ ] index.ts
- [ ] Step 4: Create types/service/ files
  - [ ] create-{resource}.ts
  - [ ] update-{resource}.ts
  - [ ] get-{resource}-by.ts
  - [ ] get-{resources}.ts
  - [ ] index.ts
- [ ] Step 5: Create {resource}.entity.ts
- [ ] Step 6: Create {resources}.service.ts
- [ ] Step 7: Create {resources}.resolver.ts
- [ ] Step 8: Create {resources}.module.ts
- [ ] Step 9: Update src/enums/id-prefix.enum.ts
- [ ] Step 10: Update src/permissions/permissions.ts
- [ ] Step 11: Update src/app.module.ts
- [ ] Step 12: Remind user to run migration
```

## When to Use

Use this skill when the user asks to:

- Create a new module/resource/entity
- Generate CRUD for a new entity
- Add a new API resource
- Scaffold a new feature module

## Required Information

Before generating, you MUST ask the user for:

1. **Resource name** (singular form, e.g., "book", "season-group", "payment-method")
2. **ID prefix** (short prefix for entity IDs, e.g., "book", "sg", "pm")
3. **Entity fields** (besides default id, createdAt, updatedAt)
4. **Entity relations** (optional, if the entity has TypeORM relations)

## Entity Relations

When user specifies TypeORM relations, add them to entity and input types.

### Relation Format

User may specify relations as:

- `creatorId -> User (ManyToOne)` - many-to-one relation (required)
- `logoId? -> Image (OneToOne)` - one-to-one relation (optional, note the `?`)
- `comments -> [Comment] (OneToMany)` - one-to-many relation

### ManyToOne Relation Pattern

In entity:

```typescript
@Field(() => String, { nullable: true })
@Column({ type: 'varchar', nullable: true })
creatorId?: MaybeNull<string>;

@ManyToOne('User', { lazy: true, onDelete: 'SET NULL', nullable: true })
creator!: Promise<MaybeNull<User>>;
```

In CreateInput (if required):

```typescript
@Field()
creatorId!: string;
```

In UpdateInput:

```typescript
@Field({ nullable: true })
creatorId?: string;
```

### OneToOne Relation Pattern

In entity:

```typescript
@Field(() => String, { nullable: true })
@Column({ type: 'varchar', nullable: true })
logoId?: MaybeNull<string>;

@OneToOne('Image', { lazy: true, nullable: true })
@JoinColumn()
logo!: Promise<MaybeNull<Image>>;
```

In CreateInput/UpdateInput - same as ManyToOne.

### OneToMany Relation Pattern

In entity only (no column, no input field):

```typescript
@Field(() => [Comment])
@OneToMany(() => Comment, (comment) => comment.parent, { lazy: true })
comments!: Promise<Comment[]>;
```

### Import Requirements

Add to entity imports when using relations:

- `ManyToOne`, `OneToOne`, `OneToMany`, `JoinColumn` from 'typeorm'
- `type { MaybeNull }` from '@pcg/predicates'
- Related entity types as `type` imports to avoid circular dependencies

## Entity Status Field

When user wants to add a status field to the entity, create an enum in `types/common.ts`.

### Status Format

User may specify status as:

- `status: ACTIVE, INACTIVE, DELETED` - simple status enum
- `status: QUEUED, PROCESSING, DONE, ERROR` - workflow status enum

### Status Pattern

#### File: `types/common.ts`

```typescript
import { registerEnumType } from '@nestjs/graphql';

export enum {PascalSingular}Status {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DELETED = 'DELETED',
}

registerEnumType({PascalSingular}Status, {
  name: '{PascalSingular}Status',
});

export const default{PascalSingular}Statuses = [
  {PascalSingular}Status.ACTIVE,
];
```

#### In entity

```typescript
import { {PascalSingular}Status } from './types/common.js';

@Field(() => {PascalSingular}Status)
@Column({
  type: 'enum',
  enum: {PascalSingular}Status,
  default: {PascalSingular}Status.ACTIVE,
})
status!: {PascalSingular}Status;

get isDeleted(): boolean {
  return this.status === {PascalSingular}Status.DELETED;
}
```

#### In CreateInput (optional)

```typescript
import { {PascalSingular}Status } from '../common.js';

@Field(() => {PascalSingular}Status, { nullable: true })
status?: {PascalSingular}Status;
```

#### In UpdateInput

```typescript
import { {PascalSingular}Status } from '../common.js';

@Field(() => {PascalSingular}Status, { nullable: true })
status?: {PascalSingular}Status;
```

#### In Filter ({kebab-plural}.ts)

```typescript
import { {PascalSingular}Status } from '../common.js';

@Field(() => [{PascalSingular}Status], { nullable: true })
statuses?: {PascalSingular}Status[];
```

#### In Service (getMany method)

```typescript
import { defineStatuses } from '@/tools/define-statuses.js';
import { {PascalSingular}Status, default{PascalSingular}Statuses } from './types/common.js';

// In getMany:
const statuses = defineStatuses(filter.statuses, default{PascalSingular}Statuses);

query.andWhere(`${alias}.status IN(:...statuses)`, { statuses });
```

#### Soft Delete Pattern

When using status for soft delete, update the delete method:

```typescript
async delete(id: string, ctx: ServiceMethodContext): Promise<void> {
  const logger = this.logger.forMethod('delete', ctx, { id });

  const {camelSingular} = await this.getOne(id);

  if (!{camelSingular} || {camelSingular}.isDeleted) {
    return;
  }

  try {
    {camelSingular}.status = {PascalSingular}Status.DELETED;
    await this.repository.save({camelSingular});
  } catch (error) {
    throw new NestError({
      message: `Failed to delete {human singular} with id ${id}`,
      key: '{SCREAMING_PLURAL}_DELETE_FAILED',
      context: logger.getContext(),
      cause: error,
    });
  }
}
```

And filter out deleted items in getOneBy:

```typescript
async getOneBy(opts: Get{PascalSingular}ByOptions): Promise<MaybeNull<{PascalSingular}>> {
  const query = this.repository
    .createQueryBuilder('{sqlAlias}')
    .where('{sqlAlias}.status != :deletedStatus', {
      deletedStatus: {PascalSingular}Status.DELETED,
    });

  if (opts.id) {
    query.andWhere('{sqlAlias}.id = :id', { id: opts.id });
  }

  return await query.getOne();
}
```

## Name Variations

From the singular resource name, derive all variations:

| Input: `season-group` | Variable | Example |
| ---------------------- | -------- | ------- |
| Kebab singular | `season-group` | season-group |
| Kebab plural | `season-groups` | season-groups |
| PascalCase singular | `SeasonGroup` | SeasonGroup |
| PascalCase plural | `SeasonGroups` | SeasonGroups |
| camelCase singular | `seasonGroup` | seasonGroup |
| camelCase plural | `seasonGroups` | seasonGroups |
| SCREAMING_SNAKE singular | `SEASON_GROUP` | SEASON_GROUP |
| SCREAMING_SNAKE plural | `SEASON_GROUPS` | SEASON_GROUPS |
| Human readable | `Season group` | Season group |

## Files to Generate

Generate files in `src/modules/{kebab-plural}/`:

```plaintext
src/modules/{season-groups}/
├── types/
│   ├── resolver/
│   │   ├── create-{season-group}.ts
│   │   ├── update-{season-group}.ts
│   │   ├── delete-{season-group}.ts
│   │   ├── {season-groups}.ts
│   │   └── index.ts
│   ├── service/
│   │   ├── create-{season-group}.ts
│   │   ├── update-{season-group}.ts
│   │   ├── get-{season-group}-by.ts
│   │   ├── get-{season-groups}.ts
│   │   └── index.ts
│   └── common.ts
├── {season-group}.entity.ts
├── {season-groups}.service.ts
├── {season-groups}.resolver.ts
└── {season-groups}.module.ts
```

## Generation Steps

### Step 1: Generate Entity

File: `src/modules/{kebab-plural}/{kebab-singular}.entity.ts`

```typescript
import { Field, ObjectType } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@ObjectType()
@Entity('{kebab-plural}')
export class {PascalSingular} extends BaseEntity {
  @Field()
  @PrimaryColumn()
  id!: string;

  @Field()
  @Column()
  title!: string;

  @Field()
  @CreateDateColumn({
    type: 'timestamptz',
    precision: 3,
  })
  createdAt!: Date;

  @Field()
  @UpdateDateColumn({
    type: 'timestamptz',
    precision: 3,
  })
  updatedAt!: Date;
}
```

### Step 2: Generate Resolver Types

#### File: `types/resolver/create-{kebab-singular}.ts`

```typescript
import { Field, InputType } from '@nestjs/graphql';
import { MinLength } from 'class-validator';

@InputType()
export class Create{PascalSingular}Input {
  @Field()
  @MinLength(1)
  title!: string;
}
```

#### File: `types/resolver/update-{kebab-singular}.ts`

```typescript
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class Update{PascalSingular}Input {
  @Field()
  id!: string;

  @Field({ nullable: true })
  title?: string;
}
```

#### File: `types/resolver/delete-{kebab-singular}.ts`

```typescript
import { Field, InputType, ObjectType } from '@nestjs/graphql';

@InputType()
export class Delete{PascalSingular}Input {
  @Field()
  id!: string;
}

@ObjectType()
export class Delete{PascalSingular}Payload {
  @Field()
  id!: string;
}
```

#### File: `types/resolver/{kebab-plural}.ts`

```typescript
import {
  ArgsType,
  Field,
  InputType,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';

import { OffsetPaginated } from '@/pagination/offset/offset-pagination.types.js';
import { OffsetPaginationInput } from '@/pagination/offset/offset-pagination.input.js';
import { ExtractSortFields } from '@/sorting/sorting.types.js';
import { {PascalSingular} } from '../../{kebab-singular}.entity.js';

@InputType()
export class {PascalPlural}Filter {
  @Field(() => [String], { nullable: true })
  ids?: string[];

  @Field({ nullable: true })
  search?: string;
}

export enum {PascalPlural}OrderBy {
  createdAt_ASC = 'createdAt_ASC',
  createdAt_DESC = 'createdAt_DESC',
}

export type {PascalPlural}OrderFields = ExtractSortFields<{PascalPlural}OrderBy>;

registerEnumType({PascalPlural}OrderBy, { name: '{PascalPlural}OrderBy' });

@ArgsType()
export class Fetch{PascalPlural}Input extends OffsetPaginationInput {
  @Field(() => {PascalPlural}OrderBy, { defaultValue: {PascalPlural}OrderBy.createdAt_DESC })
  orderBy!: {PascalPlural}OrderBy;

  @Field(() => {PascalPlural}Filter, { nullable: true })
  filter?: {PascalPlural}Filter;
}

@ObjectType()
export class Paginated{PascalPlural} extends OffsetPaginated({PascalSingular}) {}
```

#### File: `types/resolver/index.ts`

```typescript
export * from './create-{kebab-singular}.js';
export * from './update-{kebab-singular}.js';
export * from './delete-{kebab-singular}.js';
export * from './{kebab-plural}.js';
```

### Step 3: Generate Service Types

#### File: `types/service/create-{kebab-singular}.ts`

```typescript
import { Create{PascalSingular}Input } from '../resolver/create-{kebab-singular}.js';

export class Create{PascalSingular}Options extends Create{PascalSingular}Input {}
```

#### File: `types/service/update-{kebab-singular}.ts`

```typescript
import { Update{PascalSingular}Input } from '../resolver/update-{kebab-singular}.js';

export class Update{PascalSingular}Options extends Update{PascalSingular}Input {}
```

#### File: `types/service/get-{kebab-singular}-by.ts`

```typescript
export interface Get{PascalSingular}ByOptions {
  id?: string;
}
```

#### File: `types/service/get-{kebab-plural}.ts`

```typescript
import { type ListMethodOptions } from '@/pagination/types.js';
import { type {PascalPlural}Filter, type {PascalPlural}OrderBy } from '../resolver/{kebab-plural}.js';

export interface Fetch{PascalPlural}Options extends ListMethodOptions<{PascalPlural}Filter, {PascalPlural}OrderBy> {}
```

#### File: `types/service/index.ts`

```typescript
export * from './create-{kebab-singular}.js';
export * from './update-{kebab-singular}.js';
export * from './get-{kebab-singular}-by.js';
export * from './get-{kebab-plural}.js';
```

### Step 4: Generate Service

File: `src/modules/{kebab-plural}/{kebab-plural}.service.ts`

```typescript
import { InjectDataSource } from '@nestjs/typeorm';
import {
  DataSource,
  DeepPartial,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';

import { ServiceMethodContext } from '@/context/service-method-context.js';
import { IdPrefix } from '@/enums/id-prefix.enum.js';
import { BadRequestError } from '@/errors/bad-request.error.js';
import { NestError } from '@/errors/nest-error.js';
import { NotFoundError } from '@/errors/not-found.error.js';
import { createListMeta } from '@/pagination/tools.js';
import { ListMeta } from '@/pagination/types.js';
import { extractSortParams } from '@/sorting/sorting.tools.js';
import { stringifyOpts } from '@/tools/stringify-opts.js';
import { MaybeNull } from '@pcg/predicates';

import { IdService } from '@/modules/id/id.service.js';
import { InjectLoggerFactory } from '@/modules/logger/logger.providers.js';
import { Logger } from '@/modules/logger/classes/logger.js';
import { LoggerFactory } from '@/modules/logger/classes/logger-factory.js';

import { {PascalSingular} } from './{kebab-singular}.entity.js';
import { {PascalPlural}Filter, {PascalPlural}OrderBy, {PascalPlural}OrderFields } from './types/resolver/{kebab-plural}.js';
import { Create{PascalSingular}Options } from './types/service/create-{kebab-singular}.js';
import { Fetch{PascalPlural}Options } from './types/service/get-{kebab-plural}.js';
import { Get{PascalSingular}ByOptions } from './types/service/get-{kebab-singular}-by.js';
import { Update{PascalSingular}Options } from './types/service/update-{kebab-singular}.js';

export class {PascalPlural}Service {
  private logger!: Logger;

  constructor(
    @InjectLoggerFactory() private readonly loggerFactory: LoggerFactory,
    private readonly idService: IdService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {
    this.logger = this.loggerFactory.create({
      scope: this.constructor.name,
    });
  }

  public get repository(): Repository<{PascalSingular}> {
    return this.dataSource.getRepository({PascalSingular});
  }

  async getOneBy(opts: Get{PascalSingular}ByOptions): Promise<MaybeNull<{PascalSingular}>> {
    const logger = this.logger.child({
      action: this.getOneBy.name,
      ...opts,
    });

    if (Object.keys(opts).length === 0) {
      throw new BadRequestError({
        message: 'Empty options',
        key: '{SCREAMING_PLURAL}_GET_ONE_BY_EMPTY_OPTIONS',
        context: logger.getContext(),
      });
    }

    return await this.repository.findOneBy({
      ...opts,
    });
  }

  async getOne(id: string): Promise<MaybeNull<{PascalSingular}>> {
    return await this.getOneBy({ id });
  }

  async getOneByOrFail(
    opts: Get{PascalSingular}ByOptions,
    ctx: ServiceMethodContext,
  ): Promise<{PascalSingular}> {
    const logger = this.logger.forMethod(this.getOneByOrFail.name, ctx, {
      ...opts,
    });

    if (Object.keys(opts).length === 0) {
      throw new BadRequestError({
        message: 'Empty options',
        key: '{SCREAMING_PLURAL}_GET_ONE_BY_EMPTY_OPTIONS',
        context: logger.getContext(),
      });
    }

    const {camelSingular} = await this.getOneBy(opts);

    if (!{camelSingular}) {
      throw new NotFoundError({
        message: `{Human singular} with ${stringifyOpts(opts)} not found`,
        key: '{SCREAMING_PLURAL}_NOT_FOUND',
        context: logger.getContext(),
      });
    }

    return {camelSingular};
  }

  async getOneOrFail(id: string, ctx: ServiceMethodContext): Promise<{PascalSingular}> {
    return await this.getOneByOrFail({ id }, ctx);
  }

  async getMany({
    filter,
    orderBy = {PascalPlural}OrderBy.createdAt_DESC,
    limit,
    offset,
    needCountTotal,
  }: Fetch{PascalPlural}Options): Promise<[{PascalSingular}[], ListMeta]> {
    const query = this.repository.createQueryBuilder('{sqlAlias}');
    this.applyFilterToQuery(query, filter);
    this.applyOrderByToQuery(query, orderBy);

    query.limit(limit);
    query.offset(offset);

    return await Promise.all([
      query.getMany(),
      createListMeta<{PascalSingular}>({
        query,
        needCountTotal,
        limit,
        offset,
      }),
    ]);
  }

  protected applyFilterToQuery(
    query: SelectQueryBuilder<{PascalSingular}>,
    filter: {PascalPlural}Filter,
  ) {
    const alias = query.alias;

    if (filter.ids?.length) {
      query.andWhere(`${alias}.id IN(:...ids)`, {
        ids: filter.ids,
      });
    }

    if (filter.search) {
      query.andWhere(`${alias}.title ILIKE :search`, {
        search: `%${filter.search}%`,
      });
    }
  }

  protected applyOrderByToQuery(
    query: SelectQueryBuilder<{PascalSingular}>,
    orderBy: {PascalPlural}OrderBy,
  ) {
    const sort = extractSortParams<{PascalPlural}OrderFields>(orderBy);
    const alias = query.alias;
    query.addOrderBy(`${alias}.${sort.columnName}`, sort.direction);
  }

  async create(
    opts: Create{PascalSingular}Options,
    ctx: ServiceMethodContext,
  ): Promise<{PascalSingular}> {
    const logger = this.logger.forMethod(this.create.name, ctx);

    const {camelSingular} = this.repository.create({
      id: this.idService.generateEntityId(IdPrefix.{SCREAMING_SINGULAR}),
      ...opts,
    } as DeepPartial<{PascalSingular}>);

    try {
      await this.repository.save({camelSingular});
    } catch (error) {
      throw new NestError({
        message: 'Failed to create {human singular}',
        key: '{SCREAMING_PLURAL}_CREATE_FAILED',
        context: logger.getContext(),
        cause: error,
      });
    }

    return {camelSingular};
  }

  async update(
    { id, ...opts }: Update{PascalSingular}Options,
    ctx: ServiceMethodContext,
  ): Promise<{PascalSingular}> {
    const logger = this.logger.forMethod('update', ctx, { id });

    const {camelSingular} = await this.getOneOrFail(id, ctx);

    this.repository.merge({camelSingular}, opts as DeepPartial<{PascalSingular}>);

    try {
      await this.repository.save({camelSingular});
    } catch (error) {
      throw new NestError({
        message: `Failed to update {human singular} with id ${id}`,
        key: '{SCREAMING_PLURAL}_UPDATE_FAILED',
        context: logger.getContext(),
        cause: error,
      });
    }

    return {camelSingular};
  }

  async delete(id: string, ctx: ServiceMethodContext): Promise<void> {
    const logger = this.logger.forMethod('delete', ctx, { id });

    const {camelSingular} = await this.getOne(id);

    if (!{camelSingular}) {
      return;
    }

    try {
      await this.repository.remove({camelSingular});
    } catch (error) {
      throw new NestError({
        message: `Failed to delete {human singular} with id ${id}`,
        key: '{SCREAMING_PLURAL}_DELETE_FAILED',
        context: logger.getContext(),
        cause: error,
      });
    }
  }
}
```

### Step 5: Generate Resolver

File: `src/modules/{kebab-plural}/{kebab-plural}.resolver.ts`

```typescript
import { UseGuards } from '@nestjs/common';
import { Args, Info, Mutation, Query, Resolver } from '@nestjs/graphql';
import { type GraphQLResolveInfo } from 'graphql';

import { ActionContextParam } from '@/context/action-context.decorator.js';
import { type ActionContext } from '@/context/action-context.js';
import { UsePermission } from '@/permissions/use-permission.decorator.js';
import { GraphQLAuthGuard } from '@/guards/auth.guard.js';
import { GraphQLPermissionsGuard } from '@/guards/permissions.guard.js';
import { createOffsetPaginationOptions, offsetPaginatedOutput } from '@/pagination/offset/offset-pagination.helpers.js';

import { InjectLoggerFactory } from '@/modules/logger/logger.providers.js';
import { Logger } from '@/modules/logger/classes/logger.js';
import { LoggerFactory } from '@/modules/logger/classes/logger-factory.js';

import { {PascalSingular} } from './{kebab-singular}.entity.js';
import { {PascalPlural}Service } from './{kebab-plural}.service.js';
import { Create{PascalSingular}Input } from './types/resolver/create-{kebab-singular}.js';
import { Delete{PascalSingular}Input, Delete{PascalSingular}Payload } from './types/resolver/delete-{kebab-singular}.js';
import { Update{PascalSingular}Input } from './types/resolver/update-{kebab-singular}.js';
import { Fetch{PascalPlural}Input, Paginated{PascalPlural} } from './types/resolver/{kebab-plural}.js';

@Resolver(() => {PascalSingular})
@UseGuards(GraphQLAuthGuard, GraphQLPermissionsGuard)
export class {PascalPlural}Resolver {
  private logger!: Logger;

  constructor(
    @InjectLoggerFactory() protected readonly loggerFactory: LoggerFactory,
    protected readonly {camelPlural}Service: {PascalPlural}Service,
  ) {
    this.logger = this.loggerFactory.create({
      scope: this.constructor.name,
    });
  }

  @Query(() => {PascalSingular})
  @UsePermission('ugi:core:{kebab-plural}:get')
  async {camelSingular}(
    @Args('id') id: string,
    @ActionContextParam() ctx: ActionContext,
  ): Promise<{PascalSingular}> {
    return await this.{camelPlural}Service.getOneOrFail(id, ctx);
  }

  @Query(() => Paginated{PascalPlural})
  @UsePermission('ugi:core:{kebab-plural}:list')
  async {camelPlural}(
    @Args() input: Fetch{PascalPlural}Input,
    @ActionContextParam() ctx: ActionContext,
    @Info() info: GraphQLResolveInfo,
  ): Promise<Paginated{PascalPlural}> {
    const [{camelPlural}, meta] = await this.{camelPlural}Service.getMany({
      filter: input.filter ?? {},
      orderBy: input.orderBy,
      ...createOffsetPaginationOptions(input, info),
    });

    return offsetPaginatedOutput({camelPlural}, meta);
  }

  @Mutation(() => {PascalSingular})
  @UsePermission('ugi:core:{kebab-plural}:create')
  async create{PascalSingular}(
    @Args('input') input: Create{PascalSingular}Input,
    @ActionContextParam() ctx: ActionContext,
  ): Promise<{PascalSingular}> {
    return await this.{camelPlural}Service.create(input, ctx);
  }

  @Mutation(() => {PascalSingular})
  @UsePermission('ugi:core:{kebab-plural}:update')
  async update{PascalSingular}(
    @Args('input') input: Update{PascalSingular}Input,
    @ActionContextParam() ctx: ActionContext,
  ): Promise<{PascalSingular}> {
    return await this.{camelPlural}Service.update(input, ctx);
  }

  @Mutation(() => Delete{PascalSingular}Payload)
  @UsePermission('ugi:core:{kebab-plural}:delete')
  async delete{PascalSingular}(
    @ActionContextParam() ctx: ActionContext,
    @Args('input') input: Delete{PascalSingular}Input,
  ): Promise<Delete{PascalSingular}Payload> {
    await this.{camelPlural}Service.delete(input.id, ctx);

    return {
      id: input.id,
    };
  }
}
```

### Step 6: Generate Module

File: `src/modules/{kebab-plural}/{kebab-plural}.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { {PascalSingular} } from './{kebab-singular}.entity.js';
import { {PascalPlural}Resolver } from './{kebab-plural}.resolver.js';
import { {PascalPlural}Service } from './{kebab-plural}.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([{PascalSingular}]),
  ],
  providers: [
    {PascalPlural}Service,
    {PascalPlural}Resolver,
  ],
  exports: [
    {PascalPlural}Service,
  ],
})
export class {PascalPlural}Module {}
```

### Step 7: Update ID Prefix Enum

Add to `src/enums/id-prefix.enum.ts`:

```typescript
{SCREAMING_SINGULAR} = '{idPrefix}',
```

### Step 8: Update Permissions

Add to `src/permissions/permissions.ts` in the Permission type:

```typescript
/* {PascalPlural} */
| 'ugi:core:{kebab-plural}:get'
| 'ugi:core:{kebab-plural}:list'
| 'ugi:core:{kebab-plural}:create'
| 'ugi:core:{kebab-plural}:update'
| 'ugi:core:{kebab-plural}:delete'
```

### Step 9: Register Module

Add import to `src/app.module.ts`:

```typescript
import { {PascalPlural}Module } from './modules/{kebab-plural}/{kebab-plural}.module.js';
```

Add to imports array:

```typescript
{PascalPlural}Module,
```

### Step 10: Generate Migration

After creating files, remind user to run:

```bash
pnpm run migration:generate --name=Add{PascalSingular}
pnpm run migration:run
```

## SQL Alias Generation

For query builder alias, use first letters of words:

- `season-group` -> `sg`
- `payment-method` -> `pm`
- `book` -> `b`
- `user-profile` -> `up`

## Example Session

**User:** Create a new module for payment methods

**Claude:**

1. Ask for: singular name, ID prefix, fields
2. User provides: `payment-method`, `pm`, fields: `name`, `provider`, `isActive`
3. Generate all files with proper naming
4. Update id-prefix.enum.ts, permissions.ts, app.module.ts
5. Remind to run migration

## Important Notes

- Always use `@/` path alias for internal imports
- Always add `.js` extension to relative imports (ESM style)
- Entity extends `BaseEntity`
- Service uses `ServiceMethodContext` from `@/context/service-method-context.js`
- Use `ActionContext` from `@/context/action-context.js`
- Use `ActionContextParam` decorator from `@/context/action-context.decorator.js`
- Error keys follow pattern: `{SCREAMING_PLURAL}_{ACTION}`
- Permission pattern: `ugi:core:{kebab-plural}:{action}`
- Use `MaybeNull` from `@pcg/predicates`
- Use `InjectDataSource` pattern with `dataSource.getRepository()` instead of `@InjectRepository`

### Import Reference

Key imports mapping:

| Old (`@deep/nest-kit`) | New Location |
| ---------------------- | ------------ |
| `MaybeNull` | `@pcg/predicates` |
| `NestError` | `@/errors/nest-error.js` |
| `NotFoundError` | `@/errors/not-found.error.js` |
| `BadRequestError` | `@/errors/bad-request.error.js` |
| `stringifyOpts` | `@/tools/stringify-opts.js` |
| `defineStatuses` | `@/tools/define-statuses.js` |
| `createListMeta`, `ListMeta` | `@/pagination/tools.js`, `@/pagination/types.js` |
| `extractSortParams` | `@/sorting/sorting.tools.js` |
| `ExtractSortFields` | `@/sorting/sorting.types.js` |
| `OffsetPaginated` | `@/pagination/offset/offset-pagination.types.js` |
| `OffsetPaginationInput` | `@/pagination/offset/offset-pagination.input.js` |
| `createOffsetPaginationOptions`, `offsetPaginatedOutput` | `@/pagination/offset/offset-pagination.helpers.js` |
| `ListMethodOptions` | `@/pagination/types.js` |
| `ServiceMethodContext` | `@/context/service-method-context.js` |
| `ActionContext` | `@/context/action-context.js` |
| `ActionContextParam` | `@/context/action-context.decorator.js` |
| `UsePermission` | `@/permissions/use-permission.decorator.js` |
| `GraphQLAuthGuard` | `@/guards/auth.guard.js` |
| `GraphQLPermissionsGuard` | `@/guards/permissions.guard.js` |
| `Logger`, `LoggerFactory` | `@/modules/logger/classes/logger.js`, `@/modules/logger/classes/logger-factory.js` |
| `InjectLoggerFactory` | `@/modules/logger/logger.providers.js` |
| `IdService` | `@/modules/id/id.service.js` |

### Relations Best Practices

- For relations, always expose `{field}Id` with `@Field()` so clients can query just the ID without loading the relation
- Use lazy loading (`lazy: true`) for all relations
- Use `type` imports for related entities to avoid circular dependencies
- Use `onDelete: 'SET NULL'` for nullable relations, `onDelete: 'RESTRICT'` for required
- Add `{field}Id` to CreateInput for ManyToOne/OneToOne relations (required or optional based on relation)
- Add `{field}Id` to UpdateInput as optional field for ManyToOne/OneToOne relations
- OneToMany relations don't need input fields - they are managed from the other side of the relation

### ResolveField for Relations

Since we don't use `@Field` decorator on TypeORM relation properties in entities (only on `{field}Id` columns), you MUST create `@ResolveField` methods in the resolver for each relation that should be exposed in GraphQL.

#### Entity (NO @Field on relation)

```typescript
@Field(() => String, { nullable: true })
@Column({ type: 'varchar', nullable: true })
creatorId?: MaybeNull<string>;

// NO @Field here - relation is resolved via ResolveField in resolver
@ManyToOne('User', { lazy: true, onDelete: 'SET NULL', nullable: true })
creator!: Promise<MaybeNull<User>>;
```

#### Resolver ResolveField

```typescript
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { MaybeNull } from '@pcg/predicates';

import { User } from '../users/user.entity.js';

import { {PascalSingular} } from './{kebab-singular}.entity.js';

@Resolver(() => {PascalSingular})
@UseGuards(GraphQLAuthGuard, GraphQLPermissionsGuard)
export class {PascalPlural}Resolver {
  // ... other methods ...

  @ResolveField(() => User, { nullable: true })
  async creator(@Parent() {camelSingular}: {PascalSingular}): Promise<MaybeNull<User>> {
    return await {camelSingular}.creator;
  }
}
```

#### OneToMany ResolveField

```typescript
@ResolveField(() => [Comment])
async comments(@Parent() {camelSingular}: {PascalSingular}): Promise<Comment[]> {
  return await {camelSingular}.comments;
}
```

#### Important

- Import related entity types using `type` import in entity, but regular import in resolver
- The `@Parent()` decorator provides the parent entity instance
- Lazy relations return Promises, so use `await` in ResolveField
- Match nullability in `@ResolveField` decorator with the relation's nullability
