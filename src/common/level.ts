import {Vec} from "./vec.ts";

type Wall = {
    start: Vec, end: Vec,
}

export interface NetworkLevel {
    slopes: [number, number, number, number, number][]
    boosters: [number, number, number][]
    geo: [number, number, number, number][],
    mvWalls: [number, number, number, number, number, number, number, number][],
    hole?: [number, number],
    pegs: [number, number][],
}

export default {
    geo: [] as Wall[],
    movingWalls: [] as {
        start: Wall, end: Wall
    }[],
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
    pegs: [] as Vec[],

    networkLevel: null as unknown as NetworkLevel,

    setLevel(level: NetworkLevel) {
        this.networkLevel = level;
        this.geo = level.geo.map(w => {
            return {
                start: new Vec(w[0], w[1]),
                end: new Vec(w[2], w[3]),
            }
        });
        this.slopes = level.slopes.map(slope => {
            return {
                pos: new Vec(slope[0], slope[1]),
                dimensions: new Vec(slope[2], slope[3]),
                angle: slope[4],
            }
        });
        this.boosters = level.boosters.map(booster => {
            return {
                pos: new Vec(booster[0], booster[1]),
                angle: booster[2],
            }
        });
        this.movingWalls = level.mvWalls.map(w => {
            return {
                start: {
                    start: new Vec(w[0], w[1]),
                    end: new Vec(w[2], w[3]),
                },
                end: {
                    start: new Vec(w[4], w[5]),
                    end: new Vec(w[6], w[7]),
                }
            }
        })
        this.hole = level.hole ? new Vec(...level.hole) : null;
        this.pegs = level.pegs.map(peg => new Vec(...peg));
    }
}