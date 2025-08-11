import './style.css'
import {Canvas, type Drawable} from "./lib.ts";
import {Ball} from "./ball.ts";
import {handlePacket, type S2C} from "./common/packets.ts";
import {Vec} from "./common/vec.ts";

function el(draw: Drawable['draw']): Drawable {
    return {draw, tick: () => {}}
}

const canvas = new Canvas();
const arrow = "l-26 30 l20-5 l-10 60 l30 0l-10-60 20 5z";

canvas.addElement(el(c => {
    if (levelGeo.length > 1) {
        c.startPath(levelGeo[0]);
        for (let i = 1; i < levelGeo.length; i++) {
            c.path(levelGeo[i]);
        }
        c.path(levelGeo[1]);
        c.stroke(50, "#bd77b3");
        c.stroke(30, "#f2a7e8");
        c.fill("#f2a7e8");
        if (global.levelEditing) {
            c.stroke(2, "red");
        }

        for (const slope of levelSlopes) {
            c.startPath(slope.pos);
            const p2 = slope.pos.add({x: slope.dimensions.x, y: 0})
            const p3 = slope.pos.add(slope.dimensions)
            const p4 = slope.pos.add({x: 0, y: slope.dimensions.y});
            c.path(p2); c.path(p3); c.path(p4);

            const gradient = c.gradient(p2, p3, {
                0: "#f2a7e8", 0.1: "#c991c3", 0.9: "#c991c3", 1: "#f2a7e8"
            });
            c.fill(gradient);
            c.path(slope.pos);
            c.path(slope.pos.add({x: slope.dimensions.x, y: 0}));
            c.stroke(30, gradient);

            c.ctx.scale(c.dpi, c.dpi);
            c.ctx.translate(-c.camera.x + window.innerWidth, -c.camera.y + window.innerHeight);
            c.ctx.rotate(Math.PI);
            // c.fillPath(slope.pos.add({x: slope.dimensions.x / 2, y: (slope.dimensions.y - 85) / 2}), arrow, "#
            c.ctx.fillStyle = "red";
            c.ctx.fill(new Path2D(`m-1000 -500` + arrow));
            c.ctx.resetTransform();
        }
    }

    if (global.levelEditing) {
        if (downKeys.has("w")) canvas.camera.y -= 6;
        if (downKeys.has("a")) canvas.camera.x -= 6;
        if (downKeys.has("s")) canvas.camera.y += 6;
        if (downKeys.has("d")) canvas.camera.x += 6;
    }
}))

function getCookie(name: string): string | undefined {
    return document.cookie
        .split("; ")
        .find((row) => row.startsWith(`${name}=`))
        ?.split("=")[1];
}

let token = getCookie("token")!;
let levelGeo: Vec[] = [];
let levelSlopes: {
    pos: Vec,
    dimensions: Vec,
}[] = [];

export const global = {
    levelEditing: false,
    ws: new WebSocket("ws://localhost:3000" + (token ? `?token=${token}` : '')),
}

global.ws.onmessage = (ev) => {
    handlePacket<S2C>(ev.data, {
        join(packet) {
            token = packet.token;
            levelGeo = packet.geo.map(el => new Vec(...el));
            levelSlopes = packet.slopes.map(slope => {
                return {
                    pos: new Vec(slope[0], slope[1]),
                    dimensions: new Vec(slope[2], slope[3]),
                }
            })
            document.cookie = `token=${token}`
            canvas.addElement(new Ball(token, true, new Vec(...packet.pos)));
        },
        tick(packet) {
            for (const [id, serverBall] of Object.entries(packet.balls)) {
                if (id in Ball.ALL) {
                    const clientBall = Ball.ALL[id];
                    const target = new Vec(...serverBall.position);
                    clientBall.lerp = target.sub(clientBall.position).mul(0.2);
                } else {
                    const b = new Ball(id, false, new Vec(...serverBall.position));
                    canvas.addElement(b);
                }
            }
        }
    })
};

const downKeys = new Set();

document.querySelector<HTMLDivElement>("#main")!.addEventListener("click", ev => {
    if (global.levelEditing) {
        if (ev.ctrlKey) {
            levelGeo = [];
        } else {
            const point = canvas.screenToWorld(new Vec(ev.x, ev.y));
            let x = 50 * Math.round(point.x / 50);
            let y = 50 * Math.round(point.y / 50);
            const prev = levelGeo.at(-1);
            if (prev) {
                if (Math.abs(x - prev.x) > Math.abs(y - prev.y)) y = prev.y;
                else if (Math.abs(x - prev.x) < Math.abs(y - prev.y)) x = prev.x;
            }
            levelGeo.push(new Vec(x, y));
            console.log(levelGeo.map(v => v.arr()));
        }
    }
});
document.body.addEventListener("keydown", ev => {
    downKeys.add(ev.key);
    if (ev.key === "z" && global.levelEditing) {
        levelGeo.pop();
    } else if (ev.key === "i") {
        global.levelEditing = !global.levelEditing;
    }
})
document.body.addEventListener("keyup", ev => {
    downKeys.delete(ev.key);
})
canvas.addElement(el(c => {
    const prev = levelGeo.at(-1);
    if (global.levelEditing) {
        for (let i = -25; i < 25; i++) {
            for (let j = -25; j < 25; j++) {
                const x = i * 50;
                const y = j * 50;
                const origin = (i === 0 && j === 0) || x === prev?.x || y === prev?.y || (Math.abs(x - prev?.x) == Math.abs(y - prev?.y))
                c.circle(new Vec(x, y), origin ? 10: 3, origin ? "purple" : "gray");
            }
        }
    }
}))