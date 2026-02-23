import { useState, useEffect, useRef } from "preact/hooks";
import type { Subscribable } from "../services/Subscribable";

export function useService<T>(service: Subscribable<T>): T {
  const [state, setState] = useState(() => service.state);

  useEffect(() => {
    setState(service.state);
    return service.subscribe(setState);
  }, [service]);

  return state;
}

const DEFAULT_INTERVAL = 1000 / 30; // ~30 Hz

export function useServiceThrottled<T>(
  service: Subscribable<T>,
  intervalMs: number = DEFAULT_INTERVAL,
): T {
  const [state, setState] = useState(() => service.state);
  const latest = useRef(service.state);

  useEffect(() => {
    latest.current = service.state;
    setState(service.state);

    const unsub = service.subscribe((next) => {
      latest.current = next;
    });

    const timer = setInterval(() => {
      setState(latest.current);
    }, intervalMs);

    return () => {
      unsub();
      clearInterval(timer);
    };
  }, [service, intervalMs]);

  return state;
}
