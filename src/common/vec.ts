type _Vec = Vec | { x: number, y: number };

export class Vec {
    constructor(public x: number, public y: number) {}

    $mul(n: number) {
        this.x *= n;
        this.y *= n;
        return this;
    }

    lenSq() {
        return this.x ** 2 + this.y ** 2;
    }

    len() {
        return Math.sqrt(this.lenSq());
    }

    mul(n: number) {
        return new Vec(this.x * n, this.y * n);
    }

    $add(p: _Vec) {
        this.x += p.x;
        this.y += p.y;
        return this;
    }

    add(p: _Vec) {
        return new Vec(this.x + p.x, this.y + p.y);
    }

    $sub(p: _Vec) {
        this.x -= p.x;
        this.y -= p.y;
        return this;
    }

    sub(p: _Vec) {
        return new Vec(this.x - p.x, this.y - p.y);
    }

    $set(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    arr(): [number, number] {
        return [this.x, this.y];
    }

    $norm() {
        const len = this.len();
        this.x /= len;
        this.y /= len;
        return this;
    }

    greaterThan(v: _Vec) {
        return this.x > v.x && this.y > v.y;
    }

    [globalThis?.Bun?.inspect?.custom || 'toString']() {
        return `(${this.x} ${this.y})`;
    }
}