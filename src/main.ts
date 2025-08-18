import './style.css'
import {Canvas, type Drawable} from "./canvas.ts";
import {Ball} from "./ball.ts";
import {handlePacket, type JoinPacket, type S2C} from "./common/packets.ts";
import {Vec} from "./common/vec.ts";
import * as rendering from "./rendering.ts";
import * as levelEditor from "./levelEditor.ts";

export function drawable(draw: Drawable['draw']): Drawable {
    return {draw, tick: () => {}}
}

export const canvas = new Canvas();
rendering.register();
levelEditor.register();

function getCookie(name: string): string | undefined {
    return document.cookie
        .split("; ")
        .find((row) => row.startsWith(`${name}=`))
        ?.split("=")[1];
}

let token = getCookie("token")!;

export const global = {
    levelEditing: false,
    ws: new WebSocket("ws://localhost:3000" + (token ? `?token=${token}` : '')),
    level: {
        geo: [] as {start: Vec, end: Vec}[],
        slopes: [] as {
            pos: Vec,
            dimensions: Vec,
            angle: number,
        }[],
        boosters: [] as {
            pos: Vec,
            angle: number
        }[],
        hole: null as unknown as Vec,

        set packet(packet: JoinPacket) {
            this.geo = packet.geo.map(el => {return {
                start: new Vec(el[0], el[1]),
                end: new Vec(el[2], el[3]),
            }});
            this.slopes = packet.slopes.map(slope => {return {
                pos: new Vec(slope[0], slope[1]),
                dimensions: new Vec(slope[2], slope[3]),
                angle: slope[4],
            }});
            this.boosters = packet.boosters.map(booster => {return {
                pos: new Vec(booster[0], booster[1]),
                angle: booster[2],
            }});
            this.hole = new Vec(...packet.hole);
        },

        get packet(): Partial<JoinPacket> {
            return {
                geo: this.geo.map(el => [...el.start.arr(), ...el.end.arr()]),
                slopes: this.slopes.map(el => [...el.pos.arr(), ...el.dimensions.arr(), el.angle]),
                boosters: this.boosters.map(el => [...el.pos.arr(), el.angle])
            }
        }
    }
}

global.ws.onmessage = (ev) => {
    handlePacket<S2C>(ev.data, {
        join(packet) {
            global.level.packet = packet;
            document.cookie = `token=${packet.token}`
            canvas.addElement(new Ball(packet.token, true, new Vec(...packet.pos)));
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
        },

        sunk() {

        }
    })
};