import { from, noop, Observable, Subscription } from 'rxjs';
import { List, Node } from './linked-list';

export type Cancellable<V> = {
  ok?: undefined; value?: undefined; error?: undefined;
} | {
  ok: true; value: V; error?: undefined;
};
export type Result<V> = Cancellable<V> | {
  ok: false; value?: undefined; error: unknown;
};

export const iterate = async <V>(
  it: AsyncIterator<void, V, boolean>,
  getPauser?: () => (PromiseLike<void> | void),
  onCancel?: (cb: () => void) => void,
): Promise<Cancellable<V>> => {
  let cancelled = false, v = await it.next();
  if (onCancel) onCancel(() => {
    cancelled = true;
    it.next(true).catch(noop);
  });
  while (!cancelled && !v.done) {
    const pauser = getPauser && getPauser();
    if (pauser) await pauser;
    else v = await it.next(false);
  }
  return !cancelled && v.done ? { ok: true, value: v.value } : {};
};

/** Configuration for the mapper, V is the type of the output */
export type Config<V> = {
  /** @property {Function} handleException is invoked whenever the source observable throws an error,
   * it optionally returns a value to be emitted */
  handleException?: (e: unknown) => Cancellable<V>;
  /** @property {String} mode the mode used while subscribing to inner observables.
   * accepts:
   * * `merge`: emits results from mappers whenever they are ready
   * * `switch`: cancels the current mappers at the reception of a new value 
   * * `concurrent`: pauses the execution of actual mapper in favor to next one until then resumes its execution only when the newer fails
   * * `recent`: just like concurrent it emits only the recent values but it doesn't pause the execution of any mapper
   * @default 'concurrent'*/
  mode?: 'merge' | 'switch' | 'recent' | 'concurrent';
  /** @property {bool} wait indicates whether the subscription to the source `Observable` should or not
   * wait for the current async mapper to complete
   * @default false */
  wait?: boolean;
};


export const asyncMap = <T, V>(
  map: (
    value: T, node: Node,
    status: { readonly closed: boolean; },
    getPauser: () => (PromiseLike<void> | void), onCancel: (cb: () => void) => void
  ) => PromiseLike<Cancellable<V>>,
  { handleException, wait, mode = 'concurrent' }: Config<V> = {}
) => (source: Observable<T>) => new Observable<V>(subscriber => {
  let lift = Subscription.EMPTY;
  const merge = mode === 'merge', continuous = mode === 'recent';
  const list = new List(), pause = !merge && !continuous, switchMode = mode === 'switch';
  const promiseMap = new WeakMap<Node, PromiseLike<void>>(), resolveMap = new WeakMap<Node, () => void>();
  const sourceSubscription = source.subscribe({
    next: v => {
      const prev = lift, actual = lift = new Subscription(), node = list.unshift();
      promiseMap.set(node, new Promise(r => resolveMap.set(node, r)));
      actual.add(() => list.remove(node));
      const promise = map(
        v, node, { get closed() { return actual.closed; } },
        () => pause && node.next ? promiseMap.get(node.next) : undefined, cb => actual.add(cb)
      ).then<Result<V>, Result<V>>(undefined, e => ({ ok: false, error: e }));
      actual.add(from(promise).subscribe(({ ok, value, error }) => {
        if (!ok) {
          if (error && handleException) {
            const cancellable = handleException(error);
            if (cancellable.ok) subscriber.next(cancellable.value);
          }
          list.remove(node);
          resolveMap.get(node)!();
          return prev.add(actual);
        }
        subscriber.next(value);
        if (merge) prev.add(actual);
        else actual.unsubscribe();
      }));
      if (switchMode) return prev.unsubscribe();
      else actual.add(prev);
    },
    error: e => subscriber.error(e),
    complete: () => lift.add(() => subscriber.complete())
  });
  const subs = wait ? new Subscription() : sourceSubscription;
  if (wait) subs.add(sourceSubscription);
  subs.add(() => lift.unsubscribe());
  return subs;
});

export const iterateMap = <T, V>(
  map: (value: T, node: Node, status: { readonly closed: boolean; }) => AsyncGenerator<void, V, boolean>,
  config: Config<V> = { mode: 'concurrent' }
) => asyncMap(
  (value: T, node, status, getPause, onCancel) => iterate(map(value, node, status), getPause, onCancel),
  config
);
