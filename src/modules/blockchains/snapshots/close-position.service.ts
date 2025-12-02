import { Injectable } from "@nestjs/common"
import { BotSchema, PositionSchema, InjectPrimaryMongoose } from "@modules/databases"
import { ClientSession, Connection } from "mongoose"
import { DayjsService } from "@modules/mixin"
import { Decimal } from "decimal.js"
import { EventEmitter2 } from "@nestjs/event-emitter"

@Injectable()
export class ClosePositionSnapshotService {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly dayjsService: DayjsService,
        private readonly eventEmitter: EventEmitter2,
    ) { }

    async updateClosePositionTransactionRecord(
        {
            closeTxHash,
            positionId,
            session,
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
                roi: roi.toNumber(),
                pnl: pnl.toNumber(),    
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
}   