// Shared by the generated widgets in src/generated (scripts/generate.ts).

type item = {label: string, detail: string}

/** Replaces item i of a boolean array with its negation. */
let toggleAt = (values: array<bool>, i: int) => values->Array.mapWithIndex((v, j) => j == i ? !v : v)

let isOn = (values: array<bool>, i: int) => values[i]->Option.getOr(false)

let countOn = (values: array<bool>) => values->Array.filter(v => v)->Array.length
