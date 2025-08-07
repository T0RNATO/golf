import {Canvas, type Drawable, Vec} from "./lib.ts";
import {GAME} from "./main.ts";

export class Ball implements Drawable {
    public position: Vec;
    public velocity = new Vec(0, 0);
    public radius = 20;

    private dragging = false;
    private mouse = new Vec(0, 0);

    private static ALL: Ball[] = [];

    constructor(public isPlayer = false, position?: Vec) {
        this.position = position || new Vec(50, 100);
        Ball.ALL.push(this);

        // maybe remove these listeners on destruction?
        if (this.isPlayer) {
            document.getElementById("hover")!.addEventListener("mousedown", () => {
                this.dragging = true;
            });

            document.getElementById("main")!.addEventListener("mousemove", ev => {
                this.mouse.$set(ev.x, ev.y);
            })

            document.getElementById("main")!.addEventListener("mouseup", ev => {
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
            });
        }
    }

    draw(canvas: Canvas) {
        if (this.dragging) {
            const target = this.position.mul(2).$sub(canvas.screenToWorld(this.mouse));
            canvas.startPath(this.position);
            canvas.path(target);
            canvas.stroke(5, "red");
        }
        canvas.circle(this.position, this.radius, this.isPlayer ? "blue": "white");
    }
    tick(canvas: Canvas) {
        if (this.velocity.lenSq() > 0) {
            let newPos = this.position.add(this.velocity);

            for (const ball of Ball.ALL) {
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

            for (let i = 0; i < GAME.levelGeo.length - 1; i++) {
                const p1 = GAME.levelGeo[i];
                const p2 = GAME.levelGeo[i+1];
                // If it's a vertical wall, the ball is between the vertical bounds of the wall, and it's moved onto the other side of the wall
                if (p1[0] === p2[0] && isBetween(newPos.y, p1[1], p2[1]) && (newPos.x > p1[0]) !== (this.position.x > p1[0])) {
                    this.velocity.x *= -1;
                    newPos.x = p1[0] + Number(newPos.x < p1[0]);
                }
                // If it's a horizontal wall, the ball is between the horizontal bounds of the wall, and it's moved onto the other side of the wall
                if (p1[1] === p2[1] && isBetween(newPos.x, p1[0], p2[0]) && (newPos.y > p1[1]) !== (this.position.y > p1[1])) {
                    this.velocity.y *= -1;
                    newPos.y = p1[1] + Number(newPos.y < p1[1]);
                }
            }

            this.position = newPos;

            this.velocity.$mul(GAME.friction);
            if (this.velocity.lenSq() < 0.001) {
                this.velocity.$set(0, 0);
            }
        }

        if (this.isPlayer) {
            canvas.camera = this.position;
        }
    }
}

function isBetween(n: number, b1: number, b2: number) {
    const upper = Math.max(b1, b2);
    const lower = Math.min(b1, b2);
    return n > lower && n < upper;
}