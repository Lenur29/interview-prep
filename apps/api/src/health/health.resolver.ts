import { Field, ObjectType, Query, Resolver } from '@nestjs/graphql';

@ObjectType()
export class HealthStatus {
  @Field(() => String)
  status!: string;

  @Field(() => String)
  service!: string;

  @Field(() => Date)
  timestamp!: Date;
}

@Resolver()
export class HealthResolver {
  @Query(() => HealthStatus, {
    description: 'Service health check endpoint',
  })
  health(): HealthStatus {
    return {
      status: 'ok',
      service: '@interview-prep/api',
      timestamp: new Date(),
    };
  }
}
