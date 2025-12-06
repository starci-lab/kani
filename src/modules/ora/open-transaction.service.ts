import { Injectable } from "@nestjs/common"
import { OraService } from "./ora.service"
import { v4 as uuidv4 } from "uuid"
import { BotSchema, LiquidityPoolId, PrimaryMemoryStorageService, TokenId } from "@modules/databases"
import Decimal from "decimal.js"
import chalk from "chalk"
import BN from "bn.js"
import { TokenNotFoundException } from "@exceptions"
import { TokenType } from "@typedefs"
import { computeDenomination } from "@utils"

const TIMEOUT = new Decimal(10).mul(1000) // 10s

@Injectable()
export class OraOpenTransactionService {
    constructor(
        private readonly oraService: OraService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    ) {}

    private prefix(bot: BotSchema, liquidityPoolId: LiquidityPoolId) {
        const boldPink = chalk.bold.hex("#FE6D9C")
        return boldPink(`[OPEN POSITION] ${bot.name}/${bot.chainId}/${liquidityPoolId}`)
    }

    start({
        bot,
        liquidityPoolId,
    }: OraStartParams) {
        const id = uuidv4()
        this.oraService.start(id, `${this.prefix(bot, liquidityPoolId)} \n 1. Opening position...`)
        return id
    }

    onDesiredAmountsCalculated({
        id,
        bot,
        targetTokenId,
        quoteTokenId,
        desiredTargetAmount,
        desiredQuoteAmount,
        desiredGasAmount,
    }: OnDesiredAmountsCalculatedParams) {
        const previousMessage = this.oraService.getMessage(id)
        const targetToken = this.primaryMemoryStorageService.tokens.find(token => token.displayId === targetTokenId)
        if (!targetToken) {
            throw new TokenNotFoundException("Target token not found")
        }
        const quoteToken = this.primaryMemoryStorageService.tokens.find(token => token.displayId === quoteTokenId)
        if (!quoteToken) {
            throw new TokenNotFoundException("Quote token not found")
        }
        const gasToken = this.primaryMemoryStorageService.tokens.find(
            token => token.type === TokenType.Native && token.chainId === bot.chainId)
        if (!gasToken) {
            throw new TokenNotFoundException("Gas token not found")
        }
        this.oraService.update(id, `${previousMessage} \n 2. Desired amounts calculated. Target ${computeDenomination(desiredTargetAmount, targetToken.decimals)} ${targetToken.symbol}, Quote ${computeDenomination(desiredQuoteAmount, quoteToken.decimals)} ${quoteToken.symbol}, Gas ${computeDenomination(desiredGasAmount, gasToken.decimals)} ${gasToken.symbol}.`)
    }

    onTxSuccess({
        id,
        txHash,
    }: OnTxSuccessParams) {
        const previousMessage = this.oraService.getMessage(id)
        this.oraService.update(id, `${previousMessage} \n 3. Tx ${txHash} successful. Triggering rebalancing...`)
    }

    onRebalancingSuccess({
        id,
    }: OnRebalancingSuccessParams) {
        const previousMessage = this.oraService.getMessage(id)
        this.oraService.update(id, `${previousMessage} \n 4. Rebalancing successful. Snapshoting to database...`)
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

interface OraStartParams {
    bot: BotSchema
    liquidityPoolId: LiquidityPoolId
}

interface OnDesiredAmountsCalculatedParams {
    id: string
    bot: BotSchema
    targetTokenId: TokenId
    quoteTokenId: TokenId
    desiredTargetAmount: BN
    desiredQuoteAmount: BN
    desiredGasAmount: BN
}