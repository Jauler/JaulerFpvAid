import { useState, useEffect } from "preact/hooks";
import type { Subscribable } from "../services/Subscribable";

export function useService<T>(service: Subscribable<T>): T {
  const [state, setState] = useState(() => service.state);

  useEffect(() => {
    setState(service.state);
    return service.subscribe(setState);
  }, [service]);

  return state;
}
