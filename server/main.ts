import {randomUUIDv7, type ServerWebSocket} from "bun";
import {Ball} from "./ball.ts";
import {type C2S, handlePacket, type S2C, sendPacket} from "@common/packets.ts";
import {Vec} from "@common/vec.ts";
import levels from "./levels.ts";

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
    slopes: [] as [number, number, number, number, number][],
    boosters: [] as [number, number, number][],
    hole: null as unknown as Vec,
}

config.geoRaw = levels[0].geo;
config.slopes = levels[0].slopes;
config.boosters = levels[0].boosters;
config.hole = new Vec(...levels[0].hole);

const server = Bun.serve({
    fetch(req, server) {
        const query = req.url.split("?")?.[1];
        const token: string | undefined = query?.split("token=")?.[1];

        if (players.has(token) || !token) {
            // upgrade the request to a WebSocket
            if (server.upgrade(req, {data: token || randomUUIDv7('base64url')})) {
                if (token) {
                    const player = players.get(token)!;
                    publish({
                        type: "newplayer",
                        colour: player.colour,
                        name: player.name,
                        id: token,
                        pos: Ball.ALL[token].position.arr()
                    })
                }
                return;
            }
        }
        return new Response("Upgrade failed", { status: 500 });
    },
    websocket: {
        open(ws: ServerWebSocket<string>) {
            sendPacket(ws, {
                type: "join",
                token: ws.data,
                geo: config.geoRaw,
                slopes: config.slopes,
                boosters: config.boosters,
                hole: config.hole.arr(),
                players: Array.from(players.entries()).map(([id, p]) => {return {colour: p.colour, name: p.name, id}}),
            })
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
                },

                playerinfo(packet) {
                    if (!(ws.data in Ball.ALL)) {
                        new Ball(ws.data, new Vec(50 * (activePlayers.size + 2), 100));
                    }
                    activePlayers.add(ws.data);
                    players.set(ws.data, {
                        ws,
                        name: packet.name,
                        colour: packet.colour
                    });

                    publish({
                        type: "newplayer",
                        colour: packet.colour,
                        name: packet.name,
                        id: ws.data,
                        pos: Ball.ALL[ws.data].position.arr()
                    })
                },
            })
        }
    },
});

function publish(packet: S2C) {
    server.publish("game", JSON.stringify(packet));
}

interface Player {
    ws: ServerWebSocket<string>,
    colour: string,
    name: string,
}

const activePlayers: Set<string> = new Set();
export const players: Map<string, Player> = new Map();
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

for await (const line of console) {
    if (line === "start") {

    } else {
        process.stdout.write("Unknown command.\n")
    }
}