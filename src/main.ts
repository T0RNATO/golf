import './style.css'
import {Canvas, type Drawable} from "./lib.ts";
import {Ball} from "./common/ball.ts";
import {handlePacket, type S2C} from "./common/packets.ts";
import {GAME} from "./common/config.ts";
import {Vec} from "./common/vec.ts";

function el(draw: Drawable['draw']): Drawable {
    return {draw, tick: () => {}}
}

const canvas = new Canvas();

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

function getCookie(name: string): string | undefined {
    return document.cookie
        .split("; ")
        .find((row) => row.startsWith(`${name}=`))
        ?.split("=")[1];
}

let token = getCookie("token")!;

const ws = new WebSocket("ws://localhost:3000" + (token ? `?token=${token}` : ''));

Ball.ws = ws;

ws.onmessage = (ev) => {
    handlePacket<S2C>(ev.data, {
        token(packet) {
            token = packet.token;
            document.cookie = `token=${token}`
            canvas.addElement(new Ball(token, true));
        },
        tick(packet) {
            for (const [id, ball] of Object.entries(packet.balls)) {
                if (id in Ball.ALL) {
                    Ball.ALL[id].velocity.$set(...ball.velocity);
                    Ball.ALL[id].position.$set(...ball.position);
                } else {
                    const b = new Ball(id, false, new Vec(...ball.position));
                    b.velocity.$set(...ball.velocity);
                    canvas.addElement(b);
                }
            }
        }
    })
};