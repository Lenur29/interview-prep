import { ServiceMethodContext } from '@/context/service-method-context.js';
import { paramCase } from '@pcg/text-kit';

export type HookContext = ServiceMethodContext;

const createHookIdFromClassName = (className: string) => {
  const paramName = paramCase(className.replace(/Hook$/, ''));
  const [first, ...rest] = paramName.split('-');

  if (rest.length === 0) {
    return first;
  }

  // If the first part of the name is a number, prepend 'hook' to it
  return `${first}.${rest.join('-')}`;
};

/**
 * Interface for BaseHook class constructor with static id property
 */
export interface BaseHookConstructor {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  new (...args: any[]): BaseHook;
  readonly id: string;
}

/**
 * Base class for all hooks. Extend this class to create a new hook type.
 */
export abstract class BaseHook<T = unknown, U extends HookContext = HookContext> {
  /**
   * Static id getter for accessing the hook type ID directly from the class
   */
  static get id(): string {
    return createHookIdFromClassName(this.name);
  }

  /**
   * Unique identifier for the hook type.
   * This ID will be used for event emitting and subscribing.
   * Automatically generated from the class name.
   */
  get id() {
    return createHookIdFromClassName(this.constructor.name);
  }

  /**
   * Optional payload that will be passed to all hook subscribers.
   */
  payload?: T;

  /**
   * Context information for the hook
   */
  ctx: U;

  constructor(payload: T | undefined, ctx: U) {
    if (payload) {
      this.payload = payload;
    }

    this.ctx = ctx;
  }
}
