import './css/style.css'
import {Canvas, type Drawable} from "./canvas.ts";
import {Ball} from "./ball.ts";
import {handlePacket, type S2C, sendPacket} from "./common/packets.ts";
import {Vec} from "./common/vec.ts";
import * as rendering from "./rendering.ts";
import * as levelEditor from "./levelEditor.ts";
import level from "./common/level.ts";

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
    level,
    wallLerp: 0
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
            global.level.setLevel(packet);
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
            global.wallLerp = packet.lerp;
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