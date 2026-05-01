/**
 * Enum for the NestJS server mode
 */
export enum AppServer {
  /**
   * NestJS HTTP server with GraphQL
   */
  HTTP = 'http',

  /**
   * NestJS WebSocket server
   */
  WS = 'ws',

  /**
   * Run as a worker
   */
  WORKER = 'worker',
}
