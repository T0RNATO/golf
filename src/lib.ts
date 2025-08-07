export interface Drawable {
    draw(canvas: Canvas): void;
    tick(canvas: Canvas): void;
}

export class Canvas {
    private elements: Drawable[] = [];
    private _draw = this.draw.bind(this);

    public canvas = document.getElementById("canvas")! as HTMLCanvasElement;
    public dpi = window.devicePixelRatio;
    public ctx = this.canvas.getContext("2d")!;
    // Offset from (0,0) to the center of the current view.
    public camera = new Vec(0, 0);

    public rect(pos: Vec, width: number, height: number, color?: string) {
        this.ctx.fillStyle = color || "black";
        this.ctx.fillRect(...this.worldToScreen(pos), width * this.dpi, height * this.dpi);
    }

    public startPath(pos: Vec) {
        this.ctx.beginPath();
        this.ctx.moveTo(...this.worldToScreen(pos));
    }

    public path(pos: Vec) {
        this.ctx.lineTo(...this.worldToScreen(pos));
    }

    public stroke(width: number, color: string) {
        this.ctx.lineWidth = width * this.dpi;
        this.ctx.strokeStyle = color;
        this.ctx.stroke();
    }

    public fill(color: string) {
        this.ctx.fillStyle = color;
        this.ctx.fill();
    }

    public circle(pos: Vec, radius: number, color?: string) {
        this.ctx.fillStyle = color || "black";
        this.ctx.beginPath();
        this.ctx.arc(...this.worldToScreen(pos), radius * this.dpi, 0, 2 * Math.PI);
        this.ctx.fill();
    }

    public addElement(el: Drawable) {
        this.elements.push(el);
    }

    private worldToScreen(p: Vec): [number, number] {
        return p.sub(
            this.camera.sub({x: window.innerWidth / 2, y: window.innerHeight / 2})
        ).mul(this.dpi).arr();
    }

    public screenToWorld(p: Vec): Vec {
        return p.sub({x: window.innerWidth / 2, y: window.innerHeight / 2}).add(this.camera);
    }

    private updateCanvas() {
        this.canvas.width  = window.innerWidth  * this.dpi;
        this.canvas.height = window.innerHeight * this.dpi;
    }

    private draw() {
        this.ctx.fillStyle = "#2a2a2e";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        for (const el of this.elements) {
            el.draw(this);
        }
        window.requestAnimationFrame(this._draw);
    }

    private tick() {
        for (const el of this.elements) {
            el.tick(this);
        }
    }

    constructor() {
        this.updateCanvas()
        window.addEventListener("resize", this.updateCanvas.bind(this));
        window.setInterval(this.tick.bind(this), 10);
        this.draw();
    }
}

type _Vec = Vec | {x: number, y: number};
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
}