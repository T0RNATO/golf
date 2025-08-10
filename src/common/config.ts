import {Vec} from "./vec.ts";

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
    tickInterval: 10,
}