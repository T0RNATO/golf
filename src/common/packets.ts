import type {ServerWebSocket} from "bun";
import type {Level} from "../../server/levels.ts";

export type S2C = JoinPacket | TickPacket | BallSunkPacket;
export type C2S = PuttPacket;
type Packet = S2C | C2S;

type vec  = [number, number];

export interface JoinPacket extends Level {
    type: "join",
    token: string,
    pos: vec,
}

interface BallSunkPacket {
    type: "sunk",
}

interface TickPacket {
    type: "tick",
    balls: Record<string, {
        position: vec,
        velocity: vec,
    }>
}

interface PuttPacket {
    type: "putt",
    vec: vec,
}

export function handlePacket<P extends S2C | C2S>(
    packetStr: any,
    handlers: {
        [K in P['type']]: (packet: Extract<P, { type: K }>) => void;
    }) {
    const packet = parsePacket<P>(packetStr);

    if (packet && packet.type in handlers) {
        // @ts-expect-error
        handlers[packet.type](packet);
    }
}

function parsePacket<P extends S2C | C2S>(str: string): P | null {
    try {
        return JSON.parse(str) as P;
    } catch {
        return null;
    }
}

export function sendPacket(ws: ServerWebSocket<string> | WebSocket, packet: Packet) {
    ws.send(JSON.stringify(packet));
}