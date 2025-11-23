import { Injectable } from "@nestjs/common"
import { ClientSession, Connection } from "mongoose"
import { BotSchema, InjectPrimaryMongoose, PositionSchema } from "@modules/databases"
import BN from "bn.js"
import { ChainId, createObjectId, Network } from "@modules/common"
import { DayjsService } from "@modules/mixin"
import { LiquidityPoolId } from "@modules/databases"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"

@Injectable()
export class OpenPositionSnapshotService {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly dayjsService: DayjsService,
        @InjectWinston()
        private readonly logger: WinstonLogger,
    ) {}

    async addOpenPositionTransactionRecord(
        {
            targetAmountUsed,
            quoteAmountUsed,
            liquidity,
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
            session,
        }: AddOpenPositionTransactionRecordParams
    ) {
        await this.connection.model<PositionSchema>(
            PositionSchema.name
        ).create([{
            targetAmountUsed: targetAmountUsed.toString(),
            quoteAmountUsed: quoteAmountUsed.toString(),
            liquidity: liquidity.toString(),
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
        }], {
            session,
        })
        this.logger.info(
            WinstonLog.OpenPositionSuccess, {
                openTxHash,
                bot: bot.id,
            })
    }
}

export interface AddOpenPositionTransactionRecordParams {
    tickUpper: number
    tickLower: number
    targetAmountUsed: BN
    quoteAmountUsed: BN
    liquidity: BN
    gasAmountUsed?: BN
    bot: BotSchema
    network: Network
    chainId: ChainId
    liquidityPoolId: LiquidityPoolId
    targetIsA: boolean
    positionId: string
    openTxHash: string
    session?: ClientSession
}