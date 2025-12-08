import { Injectable } from "@nestjs/common"
import { ClientSession, Connection } from "mongoose"
import { 
    BotSchema, 
    InjectPrimaryMongoose, 
    PositionSchema 
} from "@modules/databases"
import BN from "bn.js"
import { createObjectId } from "@utils"
import { ChainId } from "@typedefs"
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
            snapshotTargetBalanceAmountBeforeOpen,
            snapshotQuoteBalanceAmountBeforeOpen,
            snapshotGasBalanceAmountBeforeOpen,
            liquidity,
            amountA,
            amountB,
            minBinId,
            maxBinId,
            bot,
            targetIsA,
            tickLower,
            tickUpper,
            chainId,
            liquidityPoolId,
            positionId,
            openTxHash,
            metadata,
            session,
            feeAmountTarget,
            feeAmountQuote,
        }: AddOpenPositionTransactionRecordParams
    ) {
        await this.connection.model<PositionSchema>(
            PositionSchema.name
        ).create([{
            liquidity: liquidity?.toString(),
            amountA: amountA?.toString(),
            amountB: amountB?.toString(),
            minBinId,
            maxBinId,
            snapshotGasBalanceAmountBeforeOpen: snapshotGasBalanceAmountBeforeOpen?.toString(),
            snapshotQuoteBalanceAmountBeforeOpen: snapshotQuoteBalanceAmountBeforeOpen?.toString(),
            snapshotTargetBalanceAmountBeforeOpen: snapshotTargetBalanceAmountBeforeOpen?.toString(),
            bot: bot.id,
            chainId,
            targetIsA,
            tickLower,
            tickUpper,
            liquidityPool: createObjectId(liquidityPoolId),
            positionId,
            positionOpenedAt: this.dayjsService.now().toDate(),
            openTxHash,
            isActive: true,
            metadata,
            feeAmountTarget: feeAmountTarget.toString(),
            feeAmountQuote: feeAmountQuote.toString(),
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
    snapshotTargetBalanceAmountBeforeOpen: BN
    snapshotQuoteBalanceAmountBeforeOpen: BN
    snapshotGasBalanceAmountBeforeOpen: BN
    bot: BotSchema
    chainId: ChainId
    liquidityPoolId: LiquidityPoolId
    targetIsA: boolean
    positionId: string
    openTxHash: string
    metadata?: unknown
    feeAmountTarget: BN
    feeAmountQuote: BN
    session?: ClientSession
}