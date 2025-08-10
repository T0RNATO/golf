import type {Canvas, Drawable} from "../lib.ts";
import {Vec} from "./vec.ts";
import {GAME} from "./config.ts";
import {sendPacket} from "./packets.ts";

export class Ball implements Drawable {
    public position: Vec;
    public velocity = new Vec(0, 0);
    public radius = 20;

    public static ALL: Record<string, Ball> = {};

    // Client props
    private dragging = false;
    private mouse = new Vec(0, 0);
    public static ws: WebSocket;

    constructor(public id: string, public client = false, position?: Vec) {
        this.position = position || new Vec(50, 100);
        Ball.ALL[id] = this;

        // maybe remove these listeners on destruction?
        if (this.client) {
            const main = document.getElementById("main")!;
            document.getElementById("hover")!.addEventListener("mousedown", () => {
                this.dragging = true;
            });

            main.addEventListener("mousemove", ev => {
                this.mouse.$set(ev.x, ev.y);
            })

            main.addEventListener("mouseup", this.putt.bind(this));
            main.addEventListener("pointerleave", () => {
                this.dragging = false;
            });
        }
    }

    // Clientside method
    putt(ev: MouseEvent) {
        if (this.dragging) {
            const {innerWidth: w, innerHeight: h} = window;
            const largeAxisSize = w > h ? w : h;
            const {x, y} = ev;
            this.velocity.$set(
                -GAME.puttPower * ((x - w / 2) / largeAxisSize),
                -GAME.puttPower * ((y - h / 2) / largeAxisSize),
            );
        }
        this.dragging = false;
        sendPacket(Ball.ws, {
            type: "putt",
            vec: this.velocity.arr()
        })
    }

    // Clientside method
    draw(canvas: Canvas) {
        if (this.dragging) {
            const target = this.position.mul(2).$sub(canvas.screenToWorld(this.mouse));
            canvas.startPath(this.position);
            canvas.path(target);
            canvas.stroke(5, "red");
        }
        canvas.circle(this.position, this.radius, this.client ? "blue": "white");
    }

    private collideWithBalls(newPos: Vec) {
        for (const ball of Object.values(Ball.ALL)) {
            const diff = ball.position.sub(this.position);
            const ballRadii = this.radius + ball.radius;
            if (ball !== this && diff.lenSq() < ballRadii ** 2) {
                diff.$norm();
                newPos = ball.position.sub(diff.mul(ballRadii + 1));
                diff.$mul((this.velocity.len() + ball.velocity.len()) / 4);
                this.velocity.$add(diff.mul(-1));
                ball.velocity.$add(diff);
            }
        }
        return newPos;
    }

    private collideWithWalls(newPos: Vec) {
        const oldP = this.position.arr();
        const newP = newPos.arr();
        walls: for (let i = 0; i < GAME.levelGeo.length - 1; i++) {
            const p1 = GAME.levelGeo[i].arr();
            const p2 = GAME.levelGeo[i+1].arr();

            // 0: x, 1: y
            for (const axis of [0, 1]) {
                const opp = Number(!axis);
                // Is the wall perpendicular to this axis?
                if (p1[axis] === p2[axis]) {
                    if (
                        isBetween(newP[opp], p1[opp], p2[opp], this.radius) && // Is the new position of the ball between its bounds?
                        (newP[axis] > p1[axis]) !== (oldP[axis] > p1[axis]) // Has the ball started and ended on different sides of the wall?
                    ) {
                        if (axis === 0)
                            this.velocity.x *= -1;
                        else
                            this.velocity.y *= -1;
                        newP[axis] = p1[axis] + Number(newP[axis] < p1[axis]);
                        newPos = new Vec(...newP);
                        console.debug(`Ball collided with ${axis === 0 ? 'vertical' : 'horizontal'} wall.`)
                    }
                    continue walls;
                }
            }

            // The wall is not horiz/vert so must be diagonal (because I don't support any others lol)

            // Is the ball in the wall's bounding box?
            if (isBetween(newP[0], p1[0], p2[0]) && isBetween(newP[1], p1[1], p2[1])) {
                const ball2Wall = this.position.sub(GAME.levelGeo[i]);
                const newBall2Wall = newPos.sub(GAME.levelGeo[i]);
                // Has the ball started and ended on different sides of the wall?
                if ((Math.abs(ball2Wall.x) > Math.abs(ball2Wall.y)) !== (Math.abs(newBall2Wall.x) > Math.abs(newBall2Wall.y))) {
                    const {x, y} = this.velocity;
                    this.velocity.x = -1 * y;
                    this.velocity.y = -1 * x;
                    newPos = this.position; // not ideal since the ball will visually bounce against nothing.
                    console.debug(`Ball collided with diagonal wall.`)
                }
            }
        }
        return newPos;
    }

    tick(canvas: Canvas) {
        if (this.velocity.lenSq() > 0) {
            let newPos = this.position.add(this.velocity);
            newPos = this.collideWithBalls(newPos);
            newPos = this.collideWithWalls(newPos);
            this.position = newPos;

            this.velocity.$mul(GAME.friction);
            if (this.velocity.lenSq() < 0.001) {
                this.velocity.$set(0, 0);
            }
        }

        if (this.client) {
            canvas.camera = this.position;
        }
    }
}

function isBetween(n: number, b1: number, b2: number, tolerance: number = 0) {
    const upper = Math.max(b1, b2) + tolerance;
    const lower = Math.min(b1, b2) - tolerance;
    return n > lower && n < upper;
}