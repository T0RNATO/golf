export interface Level {
    slopes: [number, number, number, number, number][]
    boosters: [number, number, number][]
    geo: [number, number, number, number][]
    hole: [number, number]
}

export default [
    {
        "geo": [
            [
                0,
                0,
                1000,
                0
            ],
            [
                1000,
                0,
                1000,
                600
            ],
            [
                1000,
                600,
                600,
                600
            ],
            [
                600,
                600,
                0,
                0
            ],
            [
                400,
                250,
                500,
                350
            ],
            [
                500,
                350,
                600,
                250
            ],
            [
                600,
                250,
                500,
                150
            ],
            [
                500,
                150,
                400,
                250
            ]
        ],
        "slopes": [
            [
                600,
                450,
                400,
                150,
                2
            ]
        ],
        "boosters": [],
        hole: [0, 0]
    }
] satisfies Level[]