import {randomUUIDv7, type ServerWebSocket} from "bun";
import {Ball} from "@common/ball.ts";
import {GAME} from "@common/config.ts";
import {type C2S, handlePacket, type S2C, sendPacket} from "@common/packets.ts";

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
            sendPacket(ws, {
                type: "token",
                token: ws.data
            })
            activePlayers.add(ws.data);
            ws.subscribe("game");
            if (!(ws.data in Ball.ALL)) {
                new Ball(ws.data);
            }
        },

        close(ws: ServerWebSocket<string>) {
            activePlayers.delete(ws.data);
        },

        message(ws: ServerWebSocket<string>, message) {
            handlePacket<C2S>(message, {
                putt(packet) {
                    const ball = Ball.ALL[ws.data];
                    ball.velocity.$set(...packet.vec);
                    // ball.position.$add(ball.velocity.mul(20));
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
        ball.tick(null!);
    }
    if (tick > 20) {
        publish({
            type: "tick",
            balls: Object.fromEntries(Object.entries(Ball.ALL).map(([id, ball]) => [id, {
                velocity: ball.velocity.arr(),
                position: ball.position.arr(),
            }]))
        })
        tick = 0;
    }
}, GAME.tickInterval);