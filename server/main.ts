import {randomUUIDv7, type ServerWebSocket} from "bun";
import {Ball} from "./ball.ts";
import {type C2S, handlePacket, type S2C, sendPacket} from "@common/packets.ts";
import {Vec} from "@common/vec.ts";

export const config = {
    friction: 1 - 0.01,
    puttPower: 40,
    __geoRaw: [] as [number, number][],
    set geoRaw(v: [number, number][]) {
        this.__geoRaw = v;
        this.geo = v.map(el => new Vec(...el));
    },
    get geoRaw() {
        return this.__geoRaw
    },
    geo: [] as Vec[],
    slopes: [
        [0, 800, 250, 100]
    ] as [number, number, number, number][]
}
config.geoRaw = [
    [0, 0],
    [250, -250],
    [500, -250],
    [750, 0],
    [750, 250],
    [500, 500],
    [250, 500],
    [0, 250],
    [0, 0],
]

const server = Bun.serve({
    fetch(req, server) {
        const query = req.url.split("?")?.[1];
        const token = query ? query.split("token=")?.[1] : undefined;

        // upgrade the request to a WebSocket
        if (server.upgrade(req, {data: token || randomUUIDv7('base64')})) return;
        return new Response("Upgrade failed", { status: 500 });
    },
    websocket: {
        open(ws: ServerWebSocket<string>) {
            if (!(ws.data in Ball.ALL)) {
                new Ball(ws.data, new Vec(50 * (activePlayers.size + 1), 50));
            }
            sendPacket(ws, {
                type: "join",
                token: ws.data,
                geo: config.geoRaw,
                slopes: config.slopes,
                pos: Ball.ALL[ws.data].position.arr(),
            })
            activePlayers.add(ws.data);
            ws.subscribe("game");
        },

        close(ws: ServerWebSocket<string>) {
            activePlayers.delete(ws.data);
        },

        message(ws: ServerWebSocket<string>, message) {
            handlePacket<C2S>(message, {
                putt(packet) {
                    const ball = Ball.ALL[ws.data];
                    ball.velocity.$add(new Vec(...packet.vec).$mul(config.puttPower));
                }
            })
        }
    },
});

function publish(packet: S2C) {
    server.publish("game", JSON.stringify(packet));
}

const activePlayers: Set<string> = new Set();
let tick = 0;

setInterval(() => {
    tick++;
    for (const ball of Object.values(Ball.ALL)) {
        ball.tick();
    }
    if (tick >= 5) {
        publish({
            type: "tick",
            balls: Object.fromEntries(Object.entries(Ball.ALL).map(([id, ball]) => [id, {
                velocity: ball.velocity.arr(),
                position: ball.position.arr(),
            }]))
        })
        tick = 0;
    }
}, 10);