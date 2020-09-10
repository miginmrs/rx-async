;
export class List {
    *iterator(node = this.head) {
        while (node) {
            yield node;
            node = node.next;
        }
    }
    [Symbol.iterator]() {
        return this.iterator();
    }
    unshift(value) {
        const next = this.head;
        const node = this.head = { value, next, list: this };
        if (next)
            next.prev = this.head;
        if (!this.tail)
            this.tail = this.head;
        return node;
    }
    remove(node) {
        if (this.head === node)
            this.head = node.next;
        if (this.tail === node)
            this.tail = node.prev;
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
//# sourceMappingURL=linked-list.js.map