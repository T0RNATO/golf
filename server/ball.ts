import {Vec} from "@common/vec.ts";
import {config} from "./main.ts";

export class Ball {
    public position: Vec;
    public velocity = new Vec(0, 0);
    public radius = 20;

    public static ALL: Record<string, Ball> = {};

    constructor(public id: string, position?: Vec) {
        this.position = position || new Vec(50, 100);
        Ball.ALL[id] = this;
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
        walls: for (let i = 0; i < config.geo.length - 1; i++) {
            const p1 = config.geo[i].arr();
            const p2 = config.geo[i+1].arr();

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
                    }
                    continue walls;
                }
            }

            // The wall is not horiz/vert so must be diagonal (because I don't support any others lol)

            // Is the ball in the wall's bounding box?
            if (isBetween(newP[0], p1[0], p2[0]) && isBetween(newP[1], p1[1], p2[1])) {
                const ball2Wall = this.position.sub(config.geo[i]);
                const newBall2Wall = newPos.sub(config.geo[i]);
                // Has the ball started and ended on different sides of the wall?
                if ((Math.abs(ball2Wall.x) > Math.abs(ball2Wall.y)) !== (Math.abs(newBall2Wall.x) > Math.abs(newBall2Wall.y))) {
                    const {x, y} = this.velocity;
                    if (Math.sign(p1[0] - p2[0]) == Math.sign(p1[1] - p2[1])) {
                        // noinspection JSSuspiciousNameCombination
                        this.velocity.$set(y, x);
                    } else {
                        this.velocity.$set(-y, -x);
                    }
                    newPos = this.position; // not ideal since the ball will visually bounce against nothing.
                }
            }
        }
        return newPos;
    }

    tick() {
        for (const slope of config.slopes) {
            if (
                slope[0] < this.position.x &&
                slope[1] < this.position.y &&
                this.position.x < slope[0] + slope[2] &&
                this.position.y < slope[1] + slope[3]
            ) {
                this.velocity.$add(new Vec(0, -0.08).$rot(slope[4]));
            }
        }
        if (this.velocity.lenSq() > 0) {
            let newPos = this.position.add(this.velocity);
            newPos = this.collideWithBalls(newPos);
            newPos = this.collideWithWalls(newPos);
            this.position = newPos;

            this.velocity.$mul(config.friction);
            if (this.velocity.lenSq() < 0.001) {
                this.velocity.$set(0, 0);
            }
        }
    }
}

function isBetween(n: number, b1: number, b2: number, tolerance: number = 0) {
    const upper = Math.max(b1, b2) + tolerance;
    const lower = Math.min(b1, b2) - tolerance;
    return n > lower && n < upper;
}