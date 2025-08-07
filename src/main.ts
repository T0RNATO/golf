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
        [500, 500],
        [250, 750],
        [250, 1000],
        [0, 1000],
    ].map(el => new Vec(...(el as [number, number]))),
}

function el(draw: Drawable['draw']): Drawable {
    return {draw, tick: () => {}}
}

const canvas = new Canvas();
const ball = new Ball(true);

canvas.addElement(el(c => {
    c.startPath(GAME.levelGeo[0]);
    for (let i = 1; i < GAME.levelGeo.length; i++) {
        c.path(GAME.levelGeo[i]);
    }
    c.path(GAME.levelGeo[1]);
    c.stroke(50, "#bd77b3");
    c.stroke(30, "#f2a7e8");
    c.fill("#f2a7e8");
}))
canvas.addElement(ball);

// for (let i = 4; i < 15; i++) {
//     for (let j = 2; j < 9; j++) {
//         canvas.addElement(new Ball(false, new Vec(i * 50, j * 50)));
//     }
// }

