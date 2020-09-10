import { from, noop, Observable, Subscription } from 'rxjs';
import { List } from './linked-list';
export const iterate = async (it, getPauser, onCancel) => {
    let cancelled = false, v = await it.next();
    if (onCancel)
        onCancel(() => {
            cancelled = true;
            it.next(true).catch(noop);
        });
    while (!cancelled && !v.done) {
        const pauser = getPauser && getPauser();
        if (pauser)
            await pauser;
        else
            v = await it.next(false);
    }
    return !cancelled && v.done ? { ok: true, value: v.value } : {};
};
export const asyncMap = (map, { handleException, wait = false, mode = 'concurrent' } = {}) => (source) => new Observable(subscriber => {
    let lift = Subscription.EMPTY;
    const merge = mode === 'merge', continuous = mode === 'recent';
    const list = new List(), pause = !merge && !continuous, switchMode = mode === 'switch';
    const promiseMap = new WeakMap(), resolveMap = new WeakMap();
    const sourceSubscription = source.subscribe({
        next: v => {
            const prev = lift, actual = lift = new Subscription(), node = list.unshift();
            promiseMap.set(node, new Promise(r => resolveMap.set(node, r)));
            actual.add(() => list.remove(node));
            const promise = map(v, node, { get closed() { return actual.closed; } }, () => pause && node.next ? promiseMap.get(node.next) : undefined, cb => actual.add(cb)).then(undefined, e => ({ ok: false, error: e }));
            actual.add(from(promise).subscribe(({ ok, value, error }) => {
                if (!ok) {
                    if (error && handleException) {
                        const cancellable = handleException(error);
                        if (cancellable.ok)
                            subscriber.next(cancellable.value);
                    }
                    list.remove(node);
                    resolveMap.get(node)();
                    return prev.add(actual);
                }
                subscriber.next(value);
                if (merge)
                    prev.add(actual);
                else
                    actual.unsubscribe();
            }));
            if (switchMode)
                return prev.unsubscribe();
            else
                actual.add(prev);
        },
        error: e => subscriber.error(e),
        complete: () => lift.add(() => subscriber.complete())
    });
    const subs = wait ? new Subscription() : sourceSubscription;
    if (wait)
        subs.add(sourceSubscription);
    subs.add(() => lift.unsubscribe());
    return subs;
});
export const iterateMap = (map, config = { mode: 'concurrent' }) => asyncMap((value, node, status, getPause, onCancel) => iterate(map(value, node, status), getPause, onCancel), config);
//# sourceMappingURL=async-map.js.map