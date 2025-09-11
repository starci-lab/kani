import { Injectable } from "@nestjs/common"
import { FetchedPool } from "@modules/blockchains"

const TICK_ZAP_THREHOLD = 1/3

export interface TickBounds {
    tickLower: number
    tickUpper: number
}

@Injectable()
export class TickManagerService {
    constructor() { }

    public tickBounds(pool: FetchedPool): TickBounds {
        const tickLower = Math.floor((pool.currentTick) / pool.tickSpacing) * pool.tickSpacing
        return {
            tickLower,
            tickUpper: tickLower + pool.tickSpacing
        }
    }

    public  tickDistanceBetweenPriorityBound(
        pool: FetchedPool,
        priorityAOverB: boolean
    ) {
        const currentTick = pool.currentTick
        const { tickLower, tickUpper } = this.tickBounds(pool)
        return priorityAOverB ? Math.abs(tickUpper - currentTick) : Math.abs(tickLower - currentTick)
    }

    public tickDistanceBetweenNotPriorityBound(
        pool: FetchedPool,
        priorityAOverB: boolean
    ) {
        const currentTick = pool.currentTick
        const { tickLower, tickUpper } = this.tickBounds(pool)
        return priorityAOverB ? Math.abs(tickLower - currentTick) : Math.abs(tickUpper - currentTick)
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