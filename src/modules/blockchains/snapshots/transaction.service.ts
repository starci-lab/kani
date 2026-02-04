import { 
    InjectPrimaryMongoose, 
    TransactionSchema, 
} from "@modules/databases"
import {
    Injectable 
} from "@nestjs/common"
import {
    DayjsService 
} from "@modules/mixin"
import {
    AddTransactionRecordParams
} from "./types"
import {
    Connection 
} from "mongoose"

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
            isStimulated,
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
                        isStimulated,
                    }
                ],
                {
                    session,
                }
            )
    }
}