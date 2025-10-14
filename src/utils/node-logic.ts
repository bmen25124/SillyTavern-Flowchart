export const resolveInput = <T extends object, K extends keyof T>(
  input: Record<string, any>,
  staticData: T,
  key: K,
): T[K] => input[key as string] ?? staticData[key];

/**
 * Safely retrieves a nested property from an object using a string path.
 * Supports dot-notation and bracket-notation for array indices.
 * @param obj The object to query.
 * @param path The path to the property (e.g., 'a.b[0].c').
 * @param defaultValue The value to return if the path is not found.
 * @returns The value at the path or the default value.
 */
export const get = (obj: any, path: string, defaultValue: any = undefined) => {
  // Normalize path to handle both dot and bracket notation for arrays.
  // e.g., 'a.b[0].c' -> ['a', 'b', '0', 'c']
  const pathArray = path
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .filter(Boolean);

  let current = obj;
  for (const part of pathArray) {
    if (current === null || current === undefined) {
      return defaultValue;
    }
    current = current[part];
  }

  return current === undefined ? defaultValue : current;
};
