import {randomUUIDv7, type ServerWebSocket} from "bun";
import {Ball} from "./ball.ts";
import {type C2S, handlePacket, type S2C, sendPacket} from "@common/packets.ts";
import {Vec} from "@common/vec.ts";
import levels, {lobby} from "./levels.ts";
import level from "@common/level.ts";

export const config = {
    friction: 1 - 0.01,
    puttPower: 40,
    level,
}

config.level.setLevel(lobby);

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
                ...config.level.networkLevel,
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
let clientUpdateInterval = 0;
let movingWallLerp = -500;

setInterval(() => {
    clientUpdateInterval++;
    movingWallLerp++;
    if (movingWallLerp >= 500) {
        movingWallLerp = -500;
    }
    for (const ball of Object.values(Ball.ALL)) {
        ball.tick(Math.abs(movingWallLerp / 500));
    }
    if (clientUpdateInterval >= 5) {
        publish({
            type: "tick",
            balls: Object.fromEntries(Object.entries(Ball.ALL).map(([id, ball]) => [id, {
                velocity: ball.velocity.arr(),
                position: ball.position.arr(),
            }])),
            lerp: movingWallLerp,
        })
        clientUpdateInterval = 0;
    }
}, 10);

for await (const line of console) {
    if (line === "start") {

    } else {
        process.stdout.write("Unknown command.\n")
    }
}