export interface Node<T = void> {
    value: T;
    next?: Node<T>;
    prev?: Node<T>;
    list: List<T>;
}
export declare class List<T = void> implements Iterable<Node<T>> {
    private iterator;
    [Symbol.iterator](): Iterator<Node<T>>;
    head?: Node<T>;
    tail?: Node<T>;
    unshift(value: T): Node<T>;
    remove(node: Node<T>): void;
}
