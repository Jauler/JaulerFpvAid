import { useState, useEffect } from "preact/hooks";
import { liveQuery } from "dexie";

export function useLiveQuery<T>(
  querier: () => Promise<T>,
  deps: unknown[],
  defaultValue: T,
): T {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    const observable = liveQuery(querier);
    const subscription = observable.subscribe({
      next: (result) => setValue(result),
      error: (err) => console.error("useLiveQuery error:", err),
    });
    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return value;
}
