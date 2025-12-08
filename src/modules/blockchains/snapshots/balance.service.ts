import { Injectable } from "@nestjs/common"
import { ClientSession, Connection } from "mongoose"
import { BotSchema, InjectPrimaryMongoose } from "@modules/databases"
import BN from "bn.js"
import { DayjsService } from "@modules/mixin"

@Injectable()
export class BalanceSnapshotService {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly dayjsService: DayjsService,
    ) {}

    async updateBotSnapshotBalancesRecord(
        {
            bot,
            targetBalanceAmount,
            quoteBalanceAmount,
            gasBalanceAmount,
            session,
        }: UpdateBotSnapshotBalancesRecordParams
    ) {  
        await this.connection.model(BotSchema.name).updateOne(
            { _id: bot.id },
            { $set: { 
                snapshotTargetBalanceAmount: targetBalanceAmount.toString(), 
                snapshotQuoteBalanceAmount: quoteBalanceAmount.toString(), 
                snapshotGasBalanceAmount: gasBalanceAmount.toString(), 
                lastBalancesSnapshotAt: this.dayjsService.now().toDate(),
            } 
            },
            {
                session,
            }
        )
    }
}

export interface UpdateBotSnapshotBalancesRecordParams {
    bot: BotSchema
    targetBalanceAmount: BN
    quoteBalanceAmount: BN
    gasBalanceAmount: BN
    session?: ClientSession
}