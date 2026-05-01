import { type Maybe } from '@pcg/predicates';

import { COOKIE_NAMES } from '@/config/cookie.config.js';

/**
 * The request interface
 */
export interface IRequest {
  headers: {
    authorization?: string;
    Authorization?: string;
  };
  cookies?: {
    [COOKIE_NAMES.subscriptionToken]?: string;
    [COOKIE_NAMES.session]?: string;
  };
}

/**
 * Extract the token from the authorization header
 *
 * @param string - authorization header string
 * @returns the token or undefined
 *
 * @example
 * const str = 'Bearer 123';
 * extractJwtFromBearerString(str) // '123'
 */
export const extractJwtFromBearerString = (string: string): Maybe<string> => {
  const [method, value] = string.split(' ');

  if (method === 'Bearer' && value) {
    return value;
  }
};

/**
 * Extract the token from the authorization header
 * @param request The request (like express request)
 * @returns The token or undefined
 * @example
 * request.headers.authorization = 'Bearer 123';
 * extractJwtFromBearerToken(request) // '123'
 */
export const extractJwtFromBearerToken = (request: IRequest): Maybe<string> => {
  const header = request.headers.authorization ?? request.headers.Authorization;
  if (typeof header === 'string') {
    const [method, value] = header.split(' ');

    if (method === 'Bearer' && value) {
      return value;
    }
  }
};

/**
 * Extract the subscription token from cookies
 * @param request - The request (like express request)
 * @returns The subscription token or undefined
 */
export const extractSubscriptionTokenFromCookie = (request: IRequest): Maybe<string> => {
  return request.cookies?.[COOKIE_NAMES.subscriptionToken];
};

/**
 * Extract the session ID from cookies
 * @param request - The request (like express request)
 * @returns The session ID or undefined
 */
export const extractSessionIdFromCookie = (request: IRequest): Maybe<string> => {
  return request.cookies?.[COOKIE_NAMES.session];
};
