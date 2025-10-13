export const resolveInput = <T extends object, K extends keyof T>(
  input: Record<string, any>,
  staticData: T,
  key: K,
): T[K] => input[key as string] ?? staticData[key];

/**
 * Safely retrieves a nested property from an object using a string path.
 * @param obj The object to query.
 * @param path The path to the property (e.g., 'a.b.c').
 * @param defaultValue The value to return if the path is not found.
 * @returns The value at the path or the default value.
 */
export const get = (obj: any, path: string, defaultValue: any = undefined) => {
  const pathArray = path.split('.').filter(Boolean);
  const result = pathArray.reduce((acc, part) => acc && acc[part], obj);
  return result === undefined ? defaultValue : result;
};
