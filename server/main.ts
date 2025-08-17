import {randomUUIDv7, type ServerWebSocket} from "bun";
import {Ball} from "./ball.ts";
import {type C2S, handlePacket, type S2C, sendPacket} from "@common/packets.ts";
import {Vec} from "@common/vec.ts";

type vec4 = [number, number, number, number];

export const config = {
    friction: 1 - 0.01,
    puttPower: 40,
    __geoRaw: [] as vec4[],
    set geoRaw(v: vec4[]) {
        this.__geoRaw = v;
        this.geo = v.map(el => {return {
            start: new Vec(el[0], el[1]),
            end: new Vec(el[2], el[3]),
        }});
    },
    get geoRaw() {
        return this.__geoRaw
    },
    geo: [] as {start: Vec, end: Vec}[],
    slopes: [
        // x, y, w, h, angle (0 up, 1 right, etc)
        // [0, 0, 200, 200, 0],
        // [0, -400, 200, 200, 1],
        // [-400, -400, 200, 200, 2],
        // [-400, 0, 200, 200, 3],
    ] as [number, number, number, number, number][],
    boosters: [
        // x, y, angle
        // [-300, -300, 2],
        // [100, -300, 1],
        // [-300, 100, 3],
        // [100, 100, 0],
    ] as [number, number, number][]
}
config.geoRaw = [
    [
        0,
        0,
        1350,
        0
    ],
    [
        1350,
        0,
        1350,
        800
    ],
    [
        1350,
        800,
        0,
        800
    ],
    [
        0,
        800,
        0,
        0
    ],
    [
        350,
        200,
        1050,
        200
    ],
    [
        1050,
        200,
        1050,
        550
    ],
    [
        1050,
        550,
        350,
        550
    ],
    [
        350,
        550,
        350,
        200
    ]
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
                new Ball(ws.data, new Vec(50 * (activePlayers.size + 1), 100));
            }
            sendPacket(ws, {
                type: "join",
                token: ws.data,
                geo: config.geoRaw,
                slopes: config.slopes,
                pos: Ball.ALL[ws.data].position.arr(),
                boosters: config.boosters
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