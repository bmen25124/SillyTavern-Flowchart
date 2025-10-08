import { useState, useCallback } from 'react';

/**
 * A hook that provides a function to force a component to re-render.
 */
export function useForceUpdate() {
  const [, setValue] = useState(0);
  return useCallback(() => setValue((value) => value + 1), []);
}
