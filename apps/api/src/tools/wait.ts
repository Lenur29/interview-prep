/**
 * Pauses execution for a specified amount of time using a Promise.
 * @param ms - The amount of time to pause in milliseconds.
 * @returns A Promise that resolves after the specified amount of time has elapsed.
 */
export const wait = async (ms: number): Promise<void> => {
  await new Promise((resolve) => {
    setTimeout(() => {
      resolve(null);
    }, ms);
  });
};
