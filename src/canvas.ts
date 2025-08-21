import {Vec} from "./common/vec.ts";

export interface Drawable {
    draw(canvas: Canvas): void;
    tick(canvas: Canvas): void;
}

export class Canvas {
    private elements: Set<Drawable> = new Set();
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

    public jump(pos: Vec) {
        this.ctx.moveTo(...this.worldToScreen(pos));
    }

    public stroke(width: number, color: string | CanvasGradient) {
        this.ctx.lineWidth = width * this.dpi;
        this.ctx.strokeStyle = color;
        this.ctx.stroke();
    }

    public transformCtx(origin: Vec) {
        this.ctx.scale(this.dpi, this.dpi);
        this.ctx.translate(
            -this.camera.x + window.innerWidth / 2 + origin.x,
            -this.camera.y + window.innerHeight / 2 + origin.y
        );
    }

    public resetTransformation() {
        this.ctx.resetTransform();
    }

    public fillPath(pos: Vec, path: string, color: string | CanvasGradient) {
        this.ctx.fillStyle = color;
        const _pos = this.worldToScreen(pos);
        this.ctx.fill(new Path2D(`m${_pos[0]} ${_pos[1]}` + path));
    }

    public fill(color: string | CanvasGradient) {
        this.ctx.fillStyle = color;
        this.ctx.fill("evenodd");
    }

    public circle(pos: Vec, radius: number, color?: string) {
        this.ctx.fillStyle = color || "black";
        this.ctx.beginPath();
        this.ctx.arc(...this.worldToScreen(pos), radius * this.dpi, 0, 2 * Math.PI);
        this.ctx.fill();
    }

    public addElement(el: Drawable) {
        this.elements.add(el);
    }

    public removeElement(el: Drawable) {
        this.elements.delete(el);
    }

    public gradient(from: Vec, to: Vec, stops: Record<number, string>): CanvasGradient {
        const gradient = this.ctx.createLinearGradient(
            ...this.worldToScreen(from),
            ...this.worldToScreen(to)
        );
        for (const [stop, colour] of Object.entries(stops)) {
            gradient.addColorStop(Number(stop), colour);
        }
        return gradient;
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
        this.dpi = window.devicePixelRatio;
    }

    private draw() {
        this.ctx.fillStyle = "#2a2a2e";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        for (const el of this.elements.values()) {
            el.draw(this);
        }
        window.requestAnimationFrame(this._draw);
    }

    private tick() {
        for (const el of this.elements.values()) {
            el.tick(this);
        }
    }

    private detectZoomChange() {
        matchMedia(
            `(resolution: ${window.devicePixelRatio}dppx)`
        ).addEventListener("change", () => {
            this.updateCanvas();
            this.detectZoomChange();
        }, { once: true });
    }

    constructor() {
        this.updateCanvas()
        window.addEventListener("resize", this.updateCanvas.bind(this));
        window.setInterval(this.tick.bind(this), 10);
        this.detectZoomChange();
        this.draw();
    }
}