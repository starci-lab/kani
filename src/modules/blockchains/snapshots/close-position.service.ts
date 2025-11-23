import { Injectable } from "@nestjs/common"
import { BotSchema, PositionSchema, InjectPrimaryMongoose } from "@modules/databases"
import { ClientSession, Connection } from "mongoose"
import { Logger as WinstonLogger } from "winston"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { DayjsService } from "@modules/mixin"
import BN from "bn.js"
import { Decimal } from "decimal.js"

@Injectable()
export class ClosePositionSnapshotService {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        @InjectWinston()
        private readonly logger: WinstonLogger,
        private readonly dayjsService: DayjsService,
    ) { }

    async updateClosePositionTransactionRecord(
        {
            closeTxHash,
            bot,
            positionId,
            session,
            targetAmountReturned,
            quoteAmountReturned,
            gasAmountReturned,
            feePaidAmount,
            roi,
            pnl,
        }: UpdateClosePositionTransactionRecordParams
    ) {
        await this.connection.model<PositionSchema>(
            PositionSchema.name
        ).updateOne({
            _id: positionId,
        }, {
            $set: {
                closeTxHash,
                positionClosedAt: this.dayjsService.now().toDate(),
                isActive: false,
                targetAmountReturned: targetAmountReturned.toString(),
                quoteAmountReturned: quoteAmountReturned.toString(),
                gasAmountReturned: gasAmountReturned?.toString(),
                feePaidAmount: feePaidAmount?.toString(),
                roi: roi.toNumber(),
                pnl: pnl.toNumber(),    
            },
        }, {
            session,
        })
        this.logger.info(
            WinstonLog.ClosePositionSuccess, {
                closeTxHash,
                bot: bot.id,
            })
    }
}

export interface UpdateClosePositionTransactionRecordParams {
    positionId: string
    closeTxHash: string
    bot: BotSchema
    targetAmountReturned: BN
    quoteAmountReturned: BN
    gasAmountReturned?: BN
    feePaidAmount?: BN
    session?: ClientSession
    roi: Decimal
    pnl: Decimal
}   