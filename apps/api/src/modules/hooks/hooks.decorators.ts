import { OnEvent } from '@nestjs/event-emitter';
import { BaseHookConstructor } from './hooks.abstracts.js';

/**
 * Decorator that registers a method as a handler for a specific hook.
 *
 * @param hook Class reference to the hook type (not an instance)
 * @returns Method decorator
 *
 * @example
 * ```typescript
 * @OnHook(ExampleHook)
 * handleExampleHook(hook: ExampleHook) {
 *   // Handle the hook here
 * }
 * ```
 */
export const OnHook = (hook: BaseHookConstructor): MethodDecorator => OnEvent(hook.id);
