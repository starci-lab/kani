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
    AddTransactionRecordParams,
    AddTransactionRecordResult
} from "./types"
import {
    strict as assert,
} from "node:assert"
import {
    Connection
} from "mongoose"

/**
 * Service responsible for appending transaction records to snapshot history.
 *
 * @example
 * await transactionSnapshotService.addTransactionRecord({ bot, txHash, chainId, type })
 */
@Injectable()
export class TransactionSnapshotService {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly dayjsService: DayjsService,
    ) {}

    /**
     * Adds a transaction record (txHash, chainId, type) for a bot.
     *
     * @param param - Transaction params (bot, txHash, chainId, type, optional session)
     * @returns Resolves when the record is created
     *
     * @example
     * await service.addTransactionRecord({ bot, txHash, chainId, type })
     */
    public async addTransactionRecord({
        txHash,
        bot,
        chainId,
        type,
        session,
    }: AddTransactionRecordParams): Promise<AddTransactionRecordResult> {
        // persist transaction record with timestamp
        const createTransactionResult = await this.connection.model<TransactionSchema>(TransactionSchema.name)
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
        assert(createTransactionResult.length > 0)
    }
}
