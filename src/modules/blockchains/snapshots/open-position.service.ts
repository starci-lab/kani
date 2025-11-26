import { Injectable } from "@nestjs/common"
import { ClientSession, Connection } from "mongoose"
import { BotSchema, InjectPrimaryMongoose, PositionSchema } from "@modules/databases"
import BN from "bn.js"
import { ChainId, createObjectId, Network } from "@modules/common"
import { DayjsService } from "@modules/mixin"
import { LiquidityPoolId } from "@modules/databases"

@Injectable()
export class OpenPositionSnapshotService {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly dayjsService: DayjsService,
    ) {}

    async addOpenPositionTransactionRecord(
        {
            targetAmountUsed,
            quoteAmountUsed,
            liquidity,
            amountA,
            amountB,
            minBinId,
            maxBinId,
            gasAmountUsed,
            bot,
            targetIsA,
            tickLower,
            tickUpper,
            network,
            chainId,
            liquidityPoolId,
            positionId,
            openTxHash,
            metadata,
            session,
        }: AddOpenPositionTransactionRecordParams
    ) {
        await this.connection.model<PositionSchema>(
            PositionSchema.name
        ).create([{
            targetAmountUsed: targetAmountUsed.toString(),
            quoteAmountUsed: quoteAmountUsed.toString(),
            liquidity: liquidity?.toString(),
            amountA: amountA?.toString(),
            amountB: amountB?.toString(),
            minBinId,
            maxBinId,
            gasAmountUsed: gasAmountUsed?.toString(),
            bot: bot.id,
            network,
            chainId,
            targetIsA,
            tickLower,
            tickUpper,
            liquidityPool: createObjectId(liquidityPoolId),
            positionId,
            positionOpenedAt: this.dayjsService.now().toDate(),
            openTxHash,
            isActive: true,
            metadata
        }], {
            session,
        })
    }
}

export interface AddOpenPositionTransactionRecordParams {
    // clmm
    tickUpper?: number
    tickLower?: number
    liquidity?: BN
    // dlmm
    amountA?: BN
    amountB?: BN
    minBinId?: number
    maxBinId?: number
    targetAmountUsed: BN
    quoteAmountUsed: BN
    gasAmountUsed?: BN
    bot: BotSchema
    network: Network
    chainId: ChainId
    liquidityPoolId: LiquidityPoolId
    targetIsA: boolean
    positionId: string
    openTxHash: string
    metadata?: unknown
    session?: ClientSession
}