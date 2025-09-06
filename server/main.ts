import {randomUUIDv7, type ServerWebSocket} from "bun";
import {Ball} from "./ball.ts";
import {type C2S, handlePacket, type S2C, sendPacket} from "@common/packets.ts";
import {Vec} from "@common/vec.ts";
import levels, {lobby} from "./levels.ts";

type vec4 = [number, number, number, number];
type vec8 = [number, number, number, number, number, number, number, number];
type wall = {
    start: Vec, end: Vec,
}

export const config = {
    friction: 1 - 0.01,
    puttPower: 40,
    __geoRaw: [] as (vec4 | vec8)[],
    set geoRaw(v: (vec4 | vec8)[]) {
        this.__geoRaw = v;
        this.geo = v.map(el => {
            const moving = el.length === 8;
            return {
                start: new Vec(el[0], el[1]),
                end: new Vec(el[2], el[3]),
                lerp: moving ? null : {
                    // @ts-expect-error
                    start: new Vec(el[4], el[5]),
                    // @ts-expect-error
                    end: new Vec(el[6], el[7]),
                }
            }
        });
    },
    get geoRaw() {
        return this.__geoRaw
    },
    geo: [] as (wall & {lerp: null | wall})[],
    slopes: [] as [number, number, number, number, number][],
    boosters: [] as [number, number, number][],
    hole: null as Vec | null,
    pegs: [] as [number, number][],
}

config.geoRaw = lobby.geo;
config.slopes = lobby.slopes;
config.boosters = lobby.boosters;
config.pegs = lobby.pegs;
config.hole = lobby.hole ? new Vec(...lobby.hole): null;

const server = Bun.serve({
    fetch(req, server) {
        const query = req.url.split("?")?.[1];
        const token: string | undefined = query?.split("token=")?.[1];

        if (players.has(token) || !token) {
            // upgrade the request to a WebSocket
            if (server.upgrade(req, {data: token || randomUUIDv7('base64url')})) return;
        }
        return new Response("Upgrade failed", { status: 500 });
    },
    websocket: {
        open(ws: ServerWebSocket<string>) {
            ws.subscribe("game");
            sendPacket(ws, {
                type: "join",
                token: ws.data,
                geo: config.geoRaw,
                slopes: config.slopes,
                boosters: config.boosters,
                pegs: config.pegs,
                hole: config.hole?.arr(),
            })
            if (players.has(ws.data)) {
                activePlayers.add(ws.data);
            }
            updatePlayerList();
        },

        close(ws: ServerWebSocket<string>) {
            activePlayers.delete(ws.data);
            updatePlayerList();
        },

        message(ws: ServerWebSocket<string>, message) {
            handlePacket<C2S>(message, {
                putt(packet) {
                    const ball = Ball.ALL[ws.data];
                    ball.velocity.$add(new Vec(...packet.vec).$mul(config.puttPower));
                },

                playerinfo(packet) {
                    if (!(ws.data in Ball.ALL)) {
                        new Ball(ws.data, new Vec(50 * (activePlayers.size + 1), 50));
                    }
                    activePlayers.add(ws.data);
                    players.set(ws.data, {
                        ws,
                        name: packet.name,
                        colour: packet.colour,
                        score: 0
                    });

                    updatePlayerList();
                },
            })
        }
    },
});

export function publish(packet: S2C) {
    server.publish("game", JSON.stringify(packet));
}

function updatePlayerList() {
    const p = [];
    for (const [id, player] of players.entries()) {
        if (activePlayers.has(id)) {
            p.push({
                id,
                name: player.name,
                colour: player.colour,
                score: player.score
            });
        }
    }
    publish({
        type: "playerlist",
        players: p
    })
}

interface Player {
    ws: ServerWebSocket<string>,
    colour: string,
    name: string,
    score: number,
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