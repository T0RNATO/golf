import './style.css'
import {type Drawable, Vec, Canvas} from "./lib.ts";
import {Ball} from "./ball.ts";

export const GAME = {
    friction: 1 - 0.01,
    puttPower: 40,
    levelGeo: [
        [0, 1000],
        [0, 0],
        [750, 0],
        [750, 500],
        [250, 500],
        [250, 1000],
        [0, 1000],
    ] as [number, number][],
}

function el(draw: Drawable['draw']): Drawable {
    return {draw, tick: () => {}}
}

const canvas = new Canvas();
const ball = new Ball(true);

canvas.addElement(el(c => {
    c.ctx.beginPath();
    for (const point of GAME.levelGeo) {
        c.path(new Vec(...point))
    }
    c.fill("#f2a7e8");
    c.stroke(20, "#bd77b3");
}))
canvas.addElement(ball);

for (let i = 4; i < 15; i++) {
    for (let j = 2; j < 3; j++) {
        canvas.addElement(new Ball(false, new Vec(i * 50, j * 50)));
    }
}

