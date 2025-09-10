import { Injectable } from "@nestjs/common"
import { FetchedPool } from "@modules/blockchains"

const TICK_ZAP_THREHOLD = 1/3

@Injectable()
export class TickManagerService {
    constructor() { }

    public tickBounds(pool: FetchedPool) {
        const lowerTick = Math.floor((pool.currentTick) / pool.tickSpacing) * pool.tickSpacing
        return [
            lowerTick,
            lowerTick + pool.tickSpacing
        ]
    }

    public  tickDistanceBetweenPriorityBound(
        pool: FetchedPool,
        priorityAOverB: boolean
    ) {
        const currentTick = pool.currentTick
        const [lowerTick, upperTick] = this.tickBounds(pool)
        return priorityAOverB ? Math.abs(upperTick - currentTick) : Math.abs(lowerTick - currentTick)
    }

    public tickDistanceBetweenNotPriorityBound(
        pool: FetchedPool,
        priorityAOverB: boolean
    ) {
        const currentTick = pool.currentTick
        const [lowerTick, upperTick] = this.tickBounds(pool)
        return priorityAOverB ? Math.abs(lowerTick - currentTick) : Math.abs(upperTick - currentTick)
    }

    public computeTickDeviation(
        pool: FetchedPool
    ) {
        return Math.floor(pool.tickSpacing * TICK_ZAP_THREHOLD)
    }

    // only can open position if current tick - tickMaxDeviation <= tickDistance
    public canOpenPosition(
        pool: FetchedPool,
        priorityAOverB: boolean
    ) {
        const tickDistance = this.tickDistanceBetweenNotPriorityBound(pool, priorityAOverB)
        const tickMaxDeviation = this.computeTickDeviation(pool)
        return tickDistance <= tickMaxDeviation
    }
}