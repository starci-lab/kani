import {
    Injectable,
} from "@nestjs/common"
import {
    Connection,
} from "mongoose"
import {
    BotSchema,
    InjectPrimaryMongoose,
    PositionSchema,
} from "@modules/databases"
import {
    UpdateTransferFeesRecordParams,
    UpdateTransferFeesRecordResult,
} from "./types"
import {
    strict as assert,
} from "node:assert"
import BN from "bn.js"

/**
 * Service responsible for updating position fees and clearing bot activePosition
 * after transfer-fees have been executed.
 *
 * @example
 * await transferFeesSnapshotService.updateTransferFeesRecord({ botId, positionId, feeTargetAmount, feeQuoteAmount, feeTransferTxHashes })
 */
@Injectable()
export class TransferFeesSnapshotService {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
    ) {}

    /**
     * Updates the position with fees (target/quote amounts and fee transfer tx hashes),
     * and unsets bot.activePosition.
     *
     * @param param - Params (botId, positionId, fee amounts, feeTransferTxHashes, optional session)
     * @returns Resolves when position and bot are updated
     */
    async updateTransferFeesRecord(
        {
            botId,
            positionId,
            feeTargetAmount,
            feeQuoteAmount,
            feeTransferTxHashes,
            session,
        }: UpdateTransferFeesRecordParams
    ): Promise<UpdateTransferFeesRecordResult> {
        if (
            feeTransferTxHashes.length > 0
            && (
                feeTargetAmount.gt(new BN(0)) 
                || feeQuoteAmount.gt(new BN(0)) 
            )
        ) {
            const positionUpdate = await this.connection
                .model<PositionSchema>(PositionSchema.name)
                .updateOne(
                    {
                        _id: positionId 
                    },
                    {
                        $set: {
                            fees: {
                                targetAmount: feeTargetAmount.toString(),
                                quoteAmount: feeQuoteAmount.toString(),
                                feeTransferTxHashes,
                            },
                        },
                    },
                    {
                        session 
                    },
                )
            assert(positionUpdate.matchedCount > 0)
        }
        const botUpdate = await this.connection
            .model<BotSchema>(BotSchema.name)
            .updateOne(
                {
                    _id: botId 
                },
                {
                    $unset: {
                        activePosition: "" 
                    } 
                },
                {
                    session 
                },
            )
        assert(botUpdate.matchedCount > 0)
    }
}
