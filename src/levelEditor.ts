import {Vec} from "./common/vec.ts";
import {canvas, drawable, global} from "./main.ts";

const cameraSpeed = 6;
const downKeys: Set<string> = new Set();
let wallStart: Vec | null = null;

let selectedTool = 1;
let mostRecentObject: {angle: number} | null = null;

const directionMap: Record<string, number> = {
    "ArrowUp":    0,
    "ArrowLeft":  1,
    "ArrowDown":  2,
    "ArrowRight": 3,
}

export function register() {
    const main = document.querySelector<HTMLDivElement>("#main")!;

    main.addEventListener("mousedown", ev => {
        if (!global.levelEditing) return;

        if (ev.ctrlKey) {
            global.level.geo = [];
            wallStart = null;
            return;
        }

        wallStart = canvas.screenToWorld(new Vec(ev.x, ev.y)).$snap(50);
    });

    main.addEventListener("mouseup", ev => {
        if (!(wallStart && global.levelEditing)) return;

        const end = canvas.screenToWorld(new Vec(ev.x, ev.y)).$snap(50);

        if (selectedTool === 1) {
            let {x, y} = end;

            if (Math.abs(x - wallStart.x) > Math.abs(y - wallStart.y)) y = wallStart.y;
            else if (Math.abs(x - wallStart.x) < Math.abs(y - wallStart.y)) x = wallStart.x;

            const wallEnd = new Vec(x, y);

            global.level.geo.push({start: wallStart, end: wallEnd});
            wallStart = null;
        } else if (selectedTool === 2) {
            const slope = {pos: wallStart, dimensions: end.sub(wallStart), angle: 0};
            mostRecentObject = slope;
            global.level.slopes.push(slope);
            wallStart = null;
        } else if (selectedTool === 3) {
            const booster = {pos: wallStart, angle: 0};
            mostRecentObject = booster;
            global.level.boosters.push(booster);
            wallStart = null;
        }

        console.log(global.level.packet);
    })

    canvas.addElement(drawable(c => {
        if (!global.levelEditing) return;
        for (let i = -5; i < 40; i++) {
            for (let j = -5; j < 40; j++) {
                const x = i * 50;
                const y = j * 50;
                const highlight = x === wallStart?.x || y === wallStart?.y || (Math.abs(x - wallStart?.x!) == Math.abs(y - wallStart?.y!));
                if (i == 0 && j == 0) {
                    c.circle(new Vec(x, y), 6, "pink");
                } else {
                    c.circle(new Vec(x, y), highlight ? 6: 3, highlight ? "purple": "pink");
                }
            }
        }
    }))

    document.body.addEventListener("keydown", ev => {
        downKeys.add(ev.key);
        const number = parseInt(ev.key);

        if (ev.key === "z" && global.levelEditing) {
            global.level.geo.pop();
        } else if (ev.key === "i") {
            global.levelEditing = !global.levelEditing;
        } else if (!Number.isNaN(number)) {
            selectedTool = number;
        } else if (ev.key.startsWith("Arrow") && mostRecentObject) {
            mostRecentObject.angle = directionMap[ev.key];
        }
    })
    document.body.addEventListener("keyup", ev => {
        downKeys.delete(ev.key);
    })

    canvas.addElement(drawable((c) => {
        if (global.levelEditing) {
            if (downKeys.has("w")) canvas.camera.y -= cameraSpeed;
            if (downKeys.has("a")) canvas.camera.x -= cameraSpeed;
            if (downKeys.has("s")) canvas.camera.y += cameraSpeed;
            if (downKeys.has("d")) canvas.camera.x += cameraSpeed;

            c.ctx.font = "50px sans-serif";
            c.ctx.fillText(String(selectedTool), 20, 50);
        }
    }))
}