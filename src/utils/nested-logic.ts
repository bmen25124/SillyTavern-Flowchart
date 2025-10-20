/**
 * A generic function to update nested properties of an object immutably.
 * It creates a deep clone and then applies the update.
 * @param obj The object to update.
 * @param path An array of keys/indices representing the path to the property.
 * @param updater A function that receives the value at the path and returns the new value.
 * @returns A new object with the updated property.
 */
export function updateNested<T extends object>(obj: T, path: (string | number)[], updater: (item: any) => any): T {
  const cloned = structuredClone(obj);
  if (path.length === 0) {
    // If path is empty, updater runs on the root object itself.
    return updater(cloned);
  }

  let cursor: any = cloned;
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    // Create path if it doesn't exist
    if (cursor[key] === undefined) {
      cursor[key] = typeof path[i + 1] === 'number' ? [] : {};
    }
    cursor = cursor[key];
  }
  const finalKey = path[path.length - 1];
  cursor[finalKey] = updater(cursor[finalKey]);
  return cloned;
}
