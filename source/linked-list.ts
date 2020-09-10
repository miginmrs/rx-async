export interface Node<T = void> { value: T; next?: Node<T>; prev?: Node<T>; list: List<T>; };
export class List<T = void> implements Iterable<Node<T>> {
  private *iterator(node = this.head) {
    while (node) {
      yield node;
      node = node.next;
    }
  }
  [Symbol.iterator](): Iterator<Node<T>> {
    return this.iterator();
  }
  head?: Node<T>;
  tail?: Node<T>;
  unshift(value: T): Node<T> {
    const next = this.head;
    const node = this.head = { value, next, list: this };
    if (next) next.prev = this.head;
    if (!this.tail) this.tail = this.head;
    return node;
  }
  remove(node: Node<T>) {
    if (this.head === node) this.head = node.next;
    if (this.tail === node) this.tail = node.prev;
    if (node.next) {
      node.next.prev = node.prev;
      node.next = undefined;
    }
    if (node.prev) {
      node.prev.next = node.next;
      node.prev = undefined;
    }
  }
}

