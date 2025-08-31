import {Vec} from "@common/vec.ts";
import {config, players, publish} from "./main.ts";
import {sendPacket} from "@common/packets.ts";

export class Ball {
    public position: Vec;
    public velocity = new Vec(0, 0);
    public radius = 20;
    // Amount the walls are "moved" towards the player in collision calculations
    // radius + 0.5 * wall draw width
    private shiftFactor = this.radius + 12;

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

        walls: for (const wall of config.geo) {
            const p1 = wall.start.arr();
            const p2 = wall.end.arr();

            // 0: x, 1: y
            for (const axis of [0, 1]) {
                const opp = Number(!axis);
                // Is the wall perpendicular to this axis?
                if (p1[axis] === p2[axis]) {
                    const shiftAxis = Math.sign(oldP[axis] - p1[axis]);
                    const shift = this.shiftFactor * shiftAxis;
                    if (
                        isBetween(newP[opp], p1[opp], p2[opp], this.shiftFactor) && // Is the new position of the ball between its bounds?
                        (newP[axis] > (p1[axis] + shift)) !== (oldP[axis] > (p1[axis] + shift)) // Has the ball started and ended on different sides of the wall?
                    ) {
                        if (axis === 0)
                            this.velocity.x *= -1;
                        else
                            this.velocity.y *= -1;
                        newP[axis] = p1[axis] + Number(newP[axis] < p1[axis]) + shiftAxis * (this.shiftFactor + 1);
                        newPos = new Vec(...newP);
                    }
                    continue walls;
                }
            }

            // The wall is not horiz/vert so must be diagonal (because I don't support any others lol)
            newPos = this.collideWithDiagonalWall(wall, newPos);
        }

        for (const pegN of config.pegs) {
            const peg = new Vec(...pegN);
            const normal = peg.sub(this.position);

            if (normal.lenSq() < this.shiftFactor ** 2) {
                normal.$norm();
                this.velocity = this.velocity.sub(normal.mul(2 * this.velocity.dot(normal)));
                return peg.sub(normal.mul(this.shiftFactor + 1));
            }
        }

        return newPos;
    }

    private collideWithDiagonalWall({start, end}: {start: Vec, end: Vec}, newPos: Vec): Vec {
        // Only collide if the ball is in the wall's bounding box
        // idk why + 10, but it makes it way harder for the ball to clip through the convex corner between two walls
        if (!(
            isBetween(newPos.x, start.x, end.x, this.shiftFactor + 10) &&
            isBetween(newPos.y, start.y, end.y, this.shiftFactor + 10)
        )) return newPos;

        const ball2Wall = this.position.sub(start);
        const newBall2Wall = newPos.sub(start);

        const alongWall = end.sub(start);
        const wallRes = newBall2Wall.vecRes(alongWall);

        const shift = newBall2Wall.sub(wallRes).$norm();

        ball2Wall   .$sub(shift.mul(this.shiftFactor));
        newBall2Wall.$sub(shift.mul(this.shiftFactor));

        const sideOfWall = Math.abs(ball2Wall.x) < Math.abs(ball2Wall.y);
        const newSideOfWall = Math.abs(newBall2Wall.x) < Math.abs(newBall2Wall.y);

        // Only collide if the ball has started and ended on different sides of the wall
        if (sideOfWall === newSideOfWall) return newPos;

        // Does the wall point towards the top-left of the screen?
        const pointsToOrigin = Math.sign(start.x - end.x) == Math.sign(start.y - end.y);

        const {x, y} = this.velocity;
        this.velocity.$set(
            pointsToOrigin ? y : -y,
            pointsToOrigin ? x : -x
        );

        // Resolve the position of the ball so it's not in the wall - find the closest point on the wall to the ball
        // and then add the minimum distance away from it that it can be.
        return start.add(wallRes).add(shift.mul(this.shiftFactor + 1));
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
        for (const booster of config.boosters) {
            if (
                booster[0] - 20 < this.position.x &&
                booster[1] - 20 < this.position.y &&
                this.position.x < booster[0] + 20 &&
                this.position.y < booster[1] + 20
            ) {
                this.velocity = new Vec(0, 20).$rot(booster[2] + 2);
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

        if (config.hole && this.position.sub(config.hole).lenSq() < 400) {
            // sendPacket(players.get(this.id)!.ws, {
            //     type: "sunk"
            // })
            const player = players.get(this.id)!;
            player.score
            publish({
                type: "score",
                score: 0,
                player: this.id
            })
        }
    }
}

function isBetween(n: number, b1: number, b2: number, tolerance: number = 0) {
    const upper = Math.max(b1, b2) + tolerance;
    const lower = Math.min(b1, b2) - tolerance;
    return n > lower && n < upper;
}