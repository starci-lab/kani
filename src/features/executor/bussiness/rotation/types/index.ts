/** Rotation bot. */
export interface RotationBot {
    /** The bot id. */
    id: string
    /** The bot's liquidity pools. */
    liquidityPoolIds: Array<string>
    /** The bot's assigned liquidity pools. */
    assignedLiquidityPoolIds: Array<string>
}