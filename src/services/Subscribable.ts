export type Listener<T> = (state: T) => void;

export abstract class Subscribable<T> {
  private _state: T;
  private listeners = new Set<Listener<T>>();

  constructor(initialState: T) {
    this._state = initialState;
  }

  get state(): T {
    return this._state;
  }

  protected setState(next: T): void {
    this._state = next;
    this.listeners.forEach((fn) => fn(next));
  }

  subscribe(fn: Listener<T>): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
}
