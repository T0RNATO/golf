import {canvas as c, drawable, global} from "./main.ts";
import type level from "./common/level.ts";
import type {Vec} from "./common/vec.ts";

const arrow = "m0 -42l-26 30 l20-5 l-10 60 l30 0l-10-60 20 5z";
const floorColour = "#f2a7e8";
const wallColour = "#bd77b3";
const movingWallColour = "#8a5682";

function drawSlopes() {
    for (const slope of global.level.slopes) {
        c.startPath(slope.pos);
        const p2 = slope.pos.add({x: slope.dimensions.x, y: 0})
        const p3 = slope.pos.add(slope.dimensions)
        const p4 = slope.pos.add({x: 0, y: slope.dimensions.y});
        c.path(p2); c.path(p3); c.path(p4);

        const colour = "rgb(255 0 80 / 0.1)";

        c.fill(colour);
        c.path(slope.pos);
        c.path(slope.pos.add({x: slope.dimensions.x, y: 0}));
        // c.stroke(30, colour);

        c.transformCtx(slope.pos.add(slope.dimensions.mul(0.5)));
        c.ctx.rotate(-slope.angle * Math.PI / 2);
        c.ctx.fillStyle = "rgb(255 0 80 / 0.3)";
        c.ctx.fill(new Path2D(arrow));
        c.resetTransformation();
    }
}

function drawBoosters() {
    for (const booster of global.level.boosters) {
        c.startPath(booster.pos.sub({x: -20, y: -20}));
        c.path(booster.pos.sub({x: 20, y: -20}));
        c.path(booster.pos.sub({x: 20, y: 20}));
        c.path(booster.pos.sub({x: -20, y: 20}));
        c.path(booster.pos.sub({x: -20, y: -20}));
        c.path(booster.pos.sub({x: 20, y: -20}));

        const colour = "rgb(0 200 0 / 0.3)";

        c.fill(colour);
        c.stroke(30, colour);

        c.transformCtx(booster.pos);
        c.ctx.scale(0.5, 0.5);
        c.ctx.rotate(-booster.angle * Math.PI / 2);
        c.ctx.fillStyle = "rgb(100 255 100 / 0.7)";
        c.ctx.fill(new Path2D(arrow));
        c.resetTransformation();
    }
}

function drawHole() {
    if (global.level.hole) {
        c.circle(global.level.hole, 25, "#222");
        c.circle(global.level.hole, 20, "black");
    }
}

export function register() {
    c.addElement(drawable(() => {
        if (global.level.geo.length) {

            const g = global.level.geo;

            let currentPathStart = g[0];
            const boundary = c.newPath(g[0].start);
            for (let i = 1; i < g.length; i++) {
                const currentWall = g[i];
                // If the next wall joins with the previous, continue the path with the endpoint
                if (currentWall.start.equals(g[i-1].end)) {
                    boundary.path(g[i].start);
                }
                // Or, if the next wall is disconnected from the previous,
                else {
                    // Complete the path of the previous section
                    boundary.path(g[i-1].end);
                    boundary.path(currentPathStart.end);
                    // And draw the new wall
                    boundary.jump(currentWall.start);
                    currentPathStart = currentWall;
                }
            }
            boundary.path(g.at(-1)!.end);
            boundary.path(currentPathStart.end);

            // Draw floor
            c.fill(floorColour, boundary);

            drawSlopes();
            drawBoosters();
            drawHole();

            // Draw walls
            c.stroke(25, wallColour, boundary);
            for (const peg of global.level.pegs) {
                c.circle(peg, 12, wallColour);
            }
            for (const wall of global.level.movingWalls) {
                c.segment(...resolveMovingWall(wall), 25, movingWallColour);
            }

            if (global.levelEditing) {
                c.stroke(2, "red", boundary);
            }
        }
    }))
}

function resolveMovingWall(wall: (typeof level)["movingWalls"][number]): [Vec, Vec] {
    const lerp = Math.abs(global.wallLerp) / 500;
    return [wall.start.start.add(wall.end.start.sub(wall.start.start).mul(lerp)), wall.start.end.add(wall.end.end.sub(wall.start.end).mul(lerp))]
}