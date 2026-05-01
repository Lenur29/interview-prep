/**
 * Supported JWT token types
 */
export enum JwtTokenType {
  /**
   * Access token. This is authorization token that is used to access protected resources.
   * Lives short time and can be refreshed by refresh token
   */
  ACCESS = 'access',

  /**
   * Refresh token.
   * Lives long time and can be used to refresh access token
   */
  REFRESH = 'refresh',

  /**
   * Service token.
   * Lives long time and can be used for service account
   */
  SERVICE = 'service',

  /**
   * Subscription token.
   * Used for GraphQL subscriptions only. Lives long time
   */
  SUBSCRIPTION = 'subscription',

  /**
   * Telegram WebApp token.
   * Short-lived (1h) bearer token issued to Telegram WebApp clients after
   * verifying initData. Stateless: no DB record, refreshed by re-submitting
   * initData on 401.
   */
  TELEGRAM_WEBAPP = 'telegram-webapp',
}

export interface BaseJwtTokenPayload {
  /**
   * Token type
   */
  sub: JwtTokenType;

  /**
   * Issuer. Service shortname that issued this token
   * @example 'bo'
   */
  iss: string;

  /**
   * User ID
   * @example 'hcu:1xgetnx5xq3'
   */
  uid: string;
}

/**
 * Payload to create new JWT access token
 */
export interface JwtAccessTokenPayload extends BaseJwtTokenPayload {
  sub: JwtTokenType.ACCESS;

  /**
   * Audience. Service shortnames that can use this token
   */
  aud: string[];
}

/**
 * Payload to create new JWT Subscription token
 */
export interface JwtSubscriptionTokenPayload extends BaseJwtTokenPayload {
  sub: JwtTokenType.SUBSCRIPTION;

  /**
   * Audience. Service shortnames that can use this token
   */
  aud: string[];
}

/**
 * Payload to create new JWT refresh token
 */
export interface JwtRefreshTokenPayload extends BaseJwtTokenPayload {
  sub: JwtTokenType.REFRESH;

  /**
   * Refresh token ID.
   * This is used to check if refresh token is exists in DB and not revoked
   */
  id: string;

}

/**
 * Payload to create new JWT Telegram WebApp token
 */
export interface JwtTelegramWebappTokenPayload extends BaseJwtTokenPayload {
  sub: JwtTokenType.TELEGRAM_WEBAPP;

  /**
   * Audience. Service shortnames that can use this token
   */
  aud: string[];
}

/**
 * Payload to create new JWT service token
 */
export interface JwtServiceTokenPayload extends BaseJwtTokenPayload {
  sub: JwtTokenType.SERVICE;

  /**
   * Audience. Service shortnames that can use this token
   */
  aud: string[];

  /**
   * Service token ID.
   * This is used to check if service token is exists in DB and not revoked
   */
  id: string;

  /**
   * Client ID
   * @example 'ext-simedia'
   */
  cid?: string;
}

/**
 * Decoded JWT access token
 */
export interface JwtAccessToken extends JwtAccessTokenPayload {
  /**
   * Expiration time
   */
  exp: number;
}

/**
 * Decoded JWT access token
 */
export interface JwtSubscriptionToken extends JwtSubscriptionTokenPayload {
  /**
   * Expiration time
   */
  exp: number;
}

/**
 * Decoded JWT refresh token
 */
export interface JwtRefreshToken extends JwtRefreshTokenPayload {
  /**
   * Expiration time
   */
  exp: number;
}

/**
 * Decoded JWT service token
 */
export interface JwtServiceToken extends JwtServiceTokenPayload {
  /**
   * Expiration time
   */
  exp?: number;
}

/**
 * Decoded JWT Telegram WebApp token
 */
export interface JwtTelegramWebappToken extends JwtTelegramWebappTokenPayload {
  /**
   * Expiration time
   */
  exp: number;
}

/**
 * Checks if the token is a JWT access token
 * @param token - The JWT token payload to check
 * @returns True if the token is an access token, false otherwise
 * @example
 * const payload = { sub: JwtTokenType.ACCESS, ... };
 * isJwtAccessToken(payload) // true
 */
export const isJwtAccessToken = (token: BaseJwtTokenPayload): token is JwtAccessToken => {
  return token.sub === JwtTokenType.ACCESS;
};

/**
 * Checks if the token is a JWT subscription token
 * @param token - The JWT token payload to check
 * @returns True if the token is a subscription token, false otherwise
 * @example
 * const payload = { sub: JwtTokenType.SUBSCRIPTION, ... };
 * isJwtSubscriptionToken(payload) // true
 */
export const isJwtSubscriptionToken = (token: BaseJwtTokenPayload): token is JwtSubscriptionToken => {
  return token.sub === JwtTokenType.SUBSCRIPTION;
};

/**
 * Checks if the token is a JWT refresh token
 * @param token - The JWT token payload to check
 * @returns True if the token is a refresh token, false otherwise
 * @example
 * const payload = { sub: JwtTokenType.REFRESH, ... };
 * isJwtRefreshToken(payload) // true
 */
export const isJwtRefreshToken = (token: BaseJwtTokenPayload): token is JwtRefreshToken => {
  return token.sub === JwtTokenType.REFRESH;
};

/**
 * Checks if the token is a JWT service token
 * @param token - The JWT token payload to check
 * @returns True if the token is a service token, false otherwise
 * @example
 * const payload = { sub: JwtTokenType.SERVICE, ... };
 * isJwtServiceToken(payload) // true
 */
export const isJwtServiceToken = (token: BaseJwtTokenPayload): token is JwtServiceToken => {
  return token.sub === JwtTokenType.SERVICE;
};

/**
 * Checks if the token is a JWT Telegram WebApp token
 */
export const isJwtTelegramWebappToken = (token: BaseJwtTokenPayload): token is JwtTelegramWebappToken => {
  return token.sub === JwtTokenType.TELEGRAM_WEBAPP;
};
