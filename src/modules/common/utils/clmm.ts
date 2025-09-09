import { roundNumber } from "./math"

export const tickToPrice = (tick: number): number => {
    return roundNumber(Math.pow(1.0001, tick))
}

export const priceToTick = (price: number): number => {
    return roundNumber(Math.floor(Math.log(price) / Math.log(1.0001)))
}