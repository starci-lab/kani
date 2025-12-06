import { Injectable } from "@nestjs/common"
import { OraService } from "./ora.service"
import { v4 as uuidv4 } from "uuid"
import { BotSchema, LiquidityPoolId } from "@modules/databases"
import Decimal from "decimal.js"
import chalk from "chalk"

const TIMEOUT = new Decimal(10).mul(1000) // 10s

@Injectable()
export class OraClosePositionService {
    constructor(
        private readonly oraService: OraService
    ) {}

    private prefix(bot: BotSchema, liquidityPoolId: LiquidityPoolId) {
        const boldPink = chalk.bold.hex("#3B82F6")
        return boldPink(`[CLOSE POSITION] ${bot.name}/${bot.chainId}/${liquidityPoolId}`)
    }

    start(
        bot: BotSchema,
        liquidityPoolId: LiquidityPoolId
    ) {
        const id = uuidv4()
        this.oraService.start(id, `${this.prefix(bot, liquidityPoolId)} \n 1. Closing position...`)
        return id
    }

    onTxSuccess({
        id,
        txHash,
    }: OnTxSuccessParams) {
        const previousMessage = this.oraService.getMessage(id)
        this.oraService.update(id, `${previousMessage} \n 2. Tx ${txHash} successful. Triggering rebalancing...`)
    }

    onRebalancingSuccess({
        id,
    }: OnRebalancingSuccessParams) {
        const previousMessage = this.oraService.getMessage(id)
        this.oraService.update(id, `${previousMessage} \n 3. Rebalancing successful. Snapshoting to database...`)
    }

    onProcessFailure({
        id,
        bot,
        liquidityPoolId,
    }: OnProcessFailureParams) {
        const prefix = this.prefix(bot, liquidityPoolId)
        this.oraService.fail(id, `${prefix} \n Process failed. Skipping...`)
        setTimeout(() => {
            this.oraService.clear(id)
        }, TIMEOUT.toNumber())
    }

    onSnapshotSuccess({
        id,
    }: OnSnapshotSuccessParams) {
        const previousMessage = this.oraService.getMessage(id)
        this.oraService.succeed(id, `${previousMessage} \n 4. Snapshot successful.`)
        setTimeout(() => {
            this.oraService.clear(id)
        }, TIMEOUT.toNumber())
    }

    onProfitabilityCalculationSuccess({
        id,
        roi,
        pnl,
    }: OnProfitabilityCalculationSuccessParams) {
        const previousMessage = this.oraService.getMessage(id)
        this.oraService.update(id, `${previousMessage} \n 5. Profitability calculation successful. ROI: ${roi.toString()}, PNL: ${pnl.toString()}`)
    }
}

interface OnTxSuccessParams {
    id: string
    txHash: string
}

interface OnProcessFailureParams {
    id: string
    bot: BotSchema
    liquidityPoolId: LiquidityPoolId
}

interface OnSnapshotSuccessParams {
    id: string
}

interface OnRebalancingSuccessParams {
    id: string
}

export interface OnProfitabilityCalculationSuccessParams {
    id: string
    roi: Decimal
    pnl: Decimal
}