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

    dot(p: _Vec) {
        return this.x * p.x + this.y * p.y;
    }

    vecRes(v: Vec) {
        return v.mul(this.dot(v) / v.dot(v));
    }

    // Rotates the vector anticlockwise in increments of 90°
    $rot(amount: number) {
        amount = amount % 4;
        switch (amount) {
            case 1: [this.y, this.x] = [this.x, this.y]; break;
            case 2: this.x *= -1; this.y *= -1; break;
            case 3: [this.y, this.x] = [-this.x, -this.y]; break;
        }
        return this;
    }

    equals(other: Vec) {
        return this.x === other.x && this.y === other.y;
    }

    $snap(grid: number) {
        this.x = grid * Math.round(this.x / grid);
        this.y = grid * Math.round(this.y / grid);
        return this;
    }

    // @ts-ignore
    [globalThis?.Bun?.inspect?.custom || 'toString']() {
        return `(${this.x} ${this.y})`;
    }
}