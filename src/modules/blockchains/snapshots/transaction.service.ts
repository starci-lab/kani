import { 
    BotSchema, 
    InjectPrimaryMongoose, 
    TransactionSchema, 
    TransactionType
} from "@modules/databases"
import {
    ClientSession, Connection 
} from "mongoose"
import {
    Injectable 
} from "@nestjs/common"
import {
    ChainId 
} from "@modules/typedefs"
import {
    DayjsService 
} from "@modules/mixin"

@Injectable()
export class TransactionSnapshotService {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly dayjsService: DayjsService,
    ) {}

    public async addTransactionRecord(
        {
            txHash,
            bot,
            chainId,
            type,
            session,
        }: AddTransactionRecordParams
    ): Promise<void> {
        await this.connection.model<TransactionSchema>(TransactionSchema.name)
            .create(
                [
                    {
                        type,
                        chainId,
                        txHash,
                        bot: bot.id,
                        timestamp: this.dayjsService.now().toDate(),
                    }
                ],
                {
                    session,
                }
            )
    }
}   

export interface AddTransactionRecordParams {
    bot: BotSchema
    session?: ClientSession
    txHash: string
    chainId: ChainId
    type: TransactionType
}