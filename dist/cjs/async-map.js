"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.iterateMap = exports.asyncMap = exports.iterate = void 0;
const rxjs_1 = require("rxjs");
const linked_list_1 = require("./linked-list");
exports.iterate = async (it, getPauser, onCancel) => {
    let cancelled = false, v = await it.next();
    if (onCancel)
        onCancel(() => {
            cancelled = true;
            it.next(true).catch(rxjs_1.noop);
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
exports.asyncMap = (map, { handleException, wait = false, mode = 'concurrent' } = {}) => (source) => new rxjs_1.Observable(subscriber => {
    let lift = rxjs_1.Subscription.EMPTY;
    const merge = mode === 'merge', continuous = mode === 'recent';
    const list = new linked_list_1.List(), pause = !merge && !continuous, switchMode = mode === 'switch';
    const promiseMap = new WeakMap(), resolveMap = new WeakMap();
    const sourceSubscription = source.subscribe({
        next: v => {
            const prev = lift, actual = lift = new rxjs_1.Subscription(), node = list.unshift();
            promiseMap.set(node, new Promise(r => resolveMap.set(node, r)));
            actual.add(() => list.remove(node));
            const promise = map(v, node, { get closed() { return actual.closed; } }, () => pause && node.next ? promiseMap.get(node.next) : undefined, cb => actual.add(cb)).then(undefined, e => ({ ok: false, error: e }));
            actual.add(rxjs_1.from(promise).subscribe(({ ok, value, error }) => {
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
    const subs = wait ? new rxjs_1.Subscription() : sourceSubscription;
    if (wait)
        subs.add(sourceSubscription);
    subs.add(() => lift.unsubscribe());
    return subs;
});
exports.iterateMap = (map, config = { mode: 'concurrent' }) => exports.asyncMap((value, node, status, getPause, onCancel) => exports.iterate(map(value, node, status), getPause, onCancel), config);
//# sourceMappingURL=async-map.js.map