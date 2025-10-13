export const resolveInput = <T extends object, K extends keyof T>(
  input: Record<string, any>,
  staticData: T,
  key: K,
): T[K] => input[key as string] ?? staticData[key];
