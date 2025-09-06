import type {ServerWebSocket} from "bun";

import type {NetworkLevel} from "./level.ts";

export type S2C = JoinPacket | TickPacket | BallSunkPacket | PlayerListPacket | ScorePacket;
export type C2S = PuttPacket | PlayerInfoPacket;
type Packet = S2C | C2S;

type vec  = [number, number];

export interface JoinPacket extends NetworkLevel {
    type: "join",
    token: string,
}

interface PlayerListPacket {
    type: "playerlist",
    players: {
        colour: string,
        name: string,
        id: string,
        score: number,
    }[]
}

interface ScorePacket {
    type: "score",
    player: string
    score: number,
}

interface BallSunkPacket {
    type: "sunk",
}

interface PlayerInfoPacket {
    type: "playerinfo",
    name: string,
    colour: string,
}

interface TickPacket {
    type: "tick",
    balls: Record<string, {
        position: vec,
        velocity: vec,
    }>,
    lerp: number
}

interface PuttPacket {
    type: "putt",
    vec: vec,
}

export function handlePacket<P extends Packet>(
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

function parsePacket<P extends Packet>(str: string): P | null {
    try {
        return JSON.parse(str) as P;
    } catch {
        return null;
    }
}

export function sendPacket(ws: ServerWebSocket<string> | WebSocket, packet: Packet) {
    ws.send(JSON.stringify(packet));
}