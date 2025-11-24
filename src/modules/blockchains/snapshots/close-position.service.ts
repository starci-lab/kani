import { Injectable } from "@nestjs/common"
import { BotSchema, PositionSchema, InjectPrimaryMongoose } from "@modules/databases"
import { ClientSession, Connection } from "mongoose"
import { DayjsService } from "@modules/mixin"
import BN from "bn.js"
import { Decimal } from "decimal.js"

@Injectable()
export class ClosePositionSnapshotService {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly dayjsService: DayjsService,
    ) { }

    async updateClosePositionTransactionRecord(
        {
            closeTxHash,
            positionId,
            session,
            roi,
            pnl,
            feesTxHash,
            targetFeeAmount,
            quoteFeeAmount,
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
                roi: roi.toNumber(),
                pnl: pnl.toNumber(),    
                feesTxHash,
                targetFeeAmount: targetFeeAmount.toString(),
                quoteFeeAmount: quoteFeeAmount.toString(),
            },
        }, 
        {
            session,
        })
    }
}

export interface UpdateClosePositionTransactionRecordParams {
    positionId: string
    closeTxHash: string
    bot: BotSchema
    session?: ClientSession
    roi: Decimal
    pnl: Decimal
    feesTxHash: string
    targetFeeAmount: BN
    quoteFeeAmount: BN
}   