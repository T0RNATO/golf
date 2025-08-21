import './css/style.css'
import {Canvas, type Drawable} from "./canvas.ts";
import {Ball} from "./ball.ts";
import {handlePacket, type JoinPacket, type S2C, sendPacket} from "./common/packets.ts";
import {Vec} from "./common/vec.ts";
import * as rendering from "./rendering.ts";
import * as levelEditor from "./levelEditor.ts";

const serverURI = "ws://localhost:3000"

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

let token = getCookie("token");

export const global = {
    levelEditing: false,
    ws: new WebSocket(serverURI + (token ? `?token=${token}` : '')),
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
        hole: null as Vec | null,

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
            this.hole = packet.hole ? new Vec(...packet.hole): null;
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

const colourEls = Array.from(document.querySelectorAll<HTMLInputElement>("#color > input"));
const nameInput = document.querySelector<HTMLInputElement>("#name")!;

document.querySelector<HTMLButtonElement>("#start")!.addEventListener("click", () => {
    const name = nameInput.value;
    const colour = colourEls.find(el => el.checked)?.value;
    if (name && colour) {
        sendPacket(global.ws, {
            type: "playerinfo", name, colour
        });
        document.querySelector<HTMLDivElement>("#menu")!.remove();
    }
})

if (token) {
    global.ws.onopen = () => {
        document.querySelector<HTMLDivElement>("#menu")!.remove();
    }
}
global.ws.onmessage = onMessage;
global.ws.onerror = () => {
    if (token) {
        token = undefined;
        document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
        global.ws = new WebSocket(serverURI);
        global.ws.onmessage = onMessage;
    }
}

const scoreboard = document.getElementById("scoreboard")! as HTMLTableElement;

function addScoreboardRow(id: string, name: string) {
    const row = document.createElement("tr");
    row.id = id;
    const cell = document.createElement("td");
    cell.innerText = name;
    row.appendChild(cell);
    row.appendChild(document.createElement("td"));
    scoreboard.appendChild(row);
}

function onMessage(ev: MessageEvent) {
    handlePacket<S2C>(ev.data, {
        join(packet) {
            global.level.packet = packet;
            document.cookie = `token=${packet.token}`
            token = packet.token;
        },

        tick(packet) {
            for (const [id, serverBall] of Object.entries(packet.balls)) {
                if (Ball.ALL.has(id)) {
                    const clientBall = Ball.ALL.get(id)!;
                    const target = new Vec(...serverBall.position);
                    const lerp = target.sub(clientBall.position).mul(0.2);
                    // Lerp to target if reasonable, or just teleport if it's too far.
                    if (lerp.lenSq() < 500) {
                        clientBall.lerp = lerp;
                    } else {
                        clientBall.position = target;
                    }
                }
            }
        },

        sunk() {

        },

        playerlist(packet) {
            const ids = new Set();

            for (const player of packet.players) {
                ids.add(player.id);
                if (!Ball.ALL.has(player.id)) {
                    canvas.addElement(new Ball(player.id, player.colour, player.id === token, new Vec(-1000, -1000)));
                    addScoreboardRow(player.id, player.name);
                }
                setScore(player.id, player.score, true);
            }

            for (const id of Array.from(Ball.ALL.keys())) {
                if (!ids.has(id)) {
                    canvas.removeElement(Ball.ALL.get(id)!);
                    Ball.ALL.delete(id);
                    document.getElementById(id)?.remove();
                }
            }
        },

        score(packet) {
            setScore(packet.player, packet.score);
        }
    })
}

function setScore(player: string, score: number, force = false) {
    const cell = document.getElementById(player)!.children[1] as HTMLTableCellElement;
    cell.innerText = String(score);
    if (!force) {
        cell.classList.add("finished");
    }
}