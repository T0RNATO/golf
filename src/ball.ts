import type {Canvas, Drawable} from "./canvas.ts";
import {Vec} from "./common/vec.ts";
import {sendPacket} from "./common/packets.ts";
import {global} from "./main.ts";

export class Ball implements Drawable {
    public position: Vec;
    public lerp = new Vec(0, 0);
    public radius = 20;

    public static ALL: Map<string, Ball> = new Map();

    private dragging = false;
    private mouse = new Vec(0, 0);

    constructor(public id: string, public colour: string, public isPlayer = false, position?: Vec) {
        this.position = position || new Vec(-100, -100);
        Ball.ALL.set(id, this);

        // maybe remove these listeners on destruction?
        if (this.isPlayer) {
            const main = document.getElementById("main")!;
            document.getElementById("hover")!.addEventListener("pointerdown", () => {
                this.dragging = true;
            });

            main.addEventListener("pointermove", ev => {
                this.mouse.$set(ev.x, ev.y);
            })

            main.addEventListener("pointerup", this.putt.bind(this));
            main.addEventListener("pointerleave", () => {
                this.dragging = false;
            });
        }
    }

    putt(ev: MouseEvent) {
        if (this.dragging) {
            const {innerWidth: w, innerHeight: h} = window;
            const largeAxisSize = w > h ? w : h;
            const {x, y} = ev;
            sendPacket(global.ws, {
                type: "putt",
                vec: [
                    -1 * ((x - w / 2) / largeAxisSize),
                    -1 * ((y - h / 2) / largeAxisSize),
                ]
            })
        }
        this.dragging = false;
    }

    draw(canvas: Canvas) {
        if (this.dragging) {
            const target = this.position.mul(2).$sub(canvas.screenToWorld(this.mouse));
            canvas.startPath(this.position);
            canvas.path(target);
            canvas.stroke(5, "red");
        }
        if (this.isPlayer && !global.levelEditing) {
            console.log(this.isPlayer, global.levelEditing);
            canvas.camera = this.position;
        }
        canvas.circle(this.position, this.radius, this.colour);
    }

    tick() {
        this.position.$add(this.lerp);
    }
}