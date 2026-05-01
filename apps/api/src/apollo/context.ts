import type { Request, Response } from 'express';

export interface GraphQLWsConnectionParams {
  token?: string;
  accessToken?: string;
  authorization?: string;
  Authorization?: string;
}

export interface GraphQLContext {
  req?: Request;
  res?: Response;
  connectionParams?: GraphQLWsConnectionParams;
}

/**
 * Create a GraphQL context. Used to pass data to the GraphQL context
 * @param ctx The context data
 */
export const createGraphQLContext = (ctx: GraphQLContext) => ctx;
