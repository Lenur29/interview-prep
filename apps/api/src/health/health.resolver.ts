import { Field, ObjectType, Query, Resolver } from '@nestjs/graphql';

import { PrismaService } from '../prisma/prisma.service';

@ObjectType()
export class HealthStatus {
  @Field(() => String)
  status!: string;

  @Field(() => String)
  service!: string;

  @Field(() => String)
  database!: string;

  @Field(() => Date)
  timestamp!: Date;
}

@Resolver()
export class HealthResolver {
  constructor(private readonly prisma: PrismaService) {}

  @Query(() => HealthStatus, {
    description: 'Service health check endpoint with database ping',
  })
  async health(): Promise<HealthStatus> {
    let database = 'ok';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      database = 'error';
    }

    return {
      status: 'ok',
      service: '@interview-prep/api',
      database,
      timestamp: new Date(),
    };
  }
}
