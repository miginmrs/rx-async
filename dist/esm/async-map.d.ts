import { Observable } from 'rxjs';
import { Node } from './linked-list';
export declare type Cancellable<V> = {
    ok?: undefined;
    value?: undefined;
    error?: undefined;
} | {
    ok: true;
    value: V;
    error?: undefined;
};
export declare type Result<V> = Cancellable<V> | {
    ok: false;
    value?: undefined;
    error: unknown;
};
export declare const iterate: <V>(it: AsyncIterator<void, V, boolean>, getPauser?: (() => (PromiseLike<void> | void)) | undefined, onCancel?: ((cb: () => void) => void) | undefined) => Promise<Cancellable<V>>;
/** Configuration for the mapper, V is the type of the output */
export declare type Config<V> = {
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
    /** @property {bool} wait indicates whether the unsubscription from the source `Observable` should or not
     * trigger the interruption of the current async mapper
     * @default false */
    wait?: boolean;
};
export declare const asyncMap: <T, V>(map: (value: T, node: Node, status: {
    readonly closed: boolean;
}, getPauser: () => (PromiseLike<void> | void), onCancel: (cb: () => void) => void) => PromiseLike<Cancellable<V>>, { handleException, wait, mode }?: Config<V>) => (source: Observable<T>) => Observable<V>;
export declare const iterateMap: <T, V>(map: (value: T, node: Node, status: {
    readonly closed: boolean;
}) => AsyncGenerator<void, V, boolean>, config?: Config<V>) => (source: Observable<T>) => Observable<V>;
