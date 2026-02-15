import {
    Injectable
} from "@nestjs/common"
import {
    Connection
} from "mongoose"
import {
    PositionSchema,
    InjectPrimaryMongoose,
    PositionSnapshotsSchema,
    PositionPerformanceSchema,
    BotSchema
} from "@modules/databases"
import {
    DayjsService
} from "@modules/mixin"
import {
    Decimal
} from "decimal.js"
import {
    PositionValueService
} from "../math"
import {
    PositionNotFoundException
} from "@modules/exceptions"
import {
    UpdateClosePositionRecordParams,
    UpdateClosePositionRecordResult
} from "./types"

/**
 * Service responsible for updating close-position snapshot records and performance.
 *
 * @example
 * await closePositionSnapshotService.updateClosePositionRecord({ before, after, positionId, closeTxHashes, ... })
 */
@Injectable()
export class ClosePositionSnapshotService {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly dayjsService: DayjsService,
        private readonly positionValueService: PositionValueService,
    ) {}

    /**
     * Updates a position with close snapshot, tx hashes, and ROI/PnL from open vs close.
     *
     * @param param - Close position params (before/after balances, positionId, tokens, etc.)
     * @returns Resolves when the position document is updated
     *
     * @example
     * await service.updateClosePositionRecord({ before, after, positionId, closeTxHashes, targetToken, quoteToken, gasToken })
     */
    async updateClosePositionRecord(
        {
            bot,
            before,
            after,
            positionId,
            closeTxHashes,
            targetToken,
            quoteToken,
            gasToken,
            session,
        }: UpdateClosePositionRecordParams
    ): Promise<UpdateClosePositionRecordResult> {
        const now = this.dayjsService.now().toDate()

        // load position to read openSnapshot for ROI/PnL
        const position = await this.connection.model<PositionSchema>(
            PositionSchema.name
        ).findById(positionId).session(session || null)

        if (!position) {
            throw new PositionNotFoundException({
                positionId,
            })
        }

        // compute position and balance values from before/after
        const {
            positionValue,
            positionValueInUsd,
            balanceValue,
            balanceValueInUsd
        } = await this.positionValueService.calculatePositionValue(
            {
                before,
                after,
                targetToken,
                quoteToken,
                gasToken,
            }
        )

        // build close snapshot from after-balance and computed values
        const closeSnapshot: Partial<PositionSnapshotsSchema> = {
            targetBalanceAmount: after.targetBalanceAmount.toString(),
            quoteBalanceAmount: after.quoteBalanceAmount.toString(),
            gasBalanceAmount: after.gasBalanceAmount.toString(),
            positionValue: positionValue.toNumber(),
            positionValueInUsd: positionValueInUsd.toNumber(),
            balanceValue: balanceValue.toNumber(),
            balanceValueInUsd: balanceValueInUsd.toNumber(),
            snapshotAt: now,
        }

        // compute ROI and PnL from open vs close snapshots
        const openPositionValue = new Decimal(position.openSnapshot?.positionValue ?? 0)
        const openPositionValueUsd = new Decimal(position.openSnapshot?.positionValueInUsd ?? 0)

        const roi = positionValue.sub(openPositionValue).div(openPositionValue).mul(100).toNumber()
        const pnl = positionValue.sub(openPositionValue).toNumber()
        const roiUsd = positionValueInUsd.sub(openPositionValueUsd).div(openPositionValueUsd).mul(100).toNumber()
        const pnlUsd = positionValueInUsd.sub(openPositionValueUsd).toNumber()

        const performance: PositionPerformanceSchema = {
            roi,
            pnl,
            roiUsd,
            pnlUsd,
        }

        // persist close snapshot, tx hashes, and performance to position
        await this.connection.model<PositionSchema>(
            PositionSchema.name
        ).updateOne({
            _id: positionId,
        },
        {
            $set: {
                closeTxHashes,
                isActive: false,
                closeSnapshot,
                performance,
            },
        }, 
        {
            session,
        })

        // clear the bot's active position
        await this.connection.model<BotSchema>(BotSchema.name).updateOne(
            {
                _id: bot.id,
            },
            {
                $set: {
                    activePosition: "",
                },
            },
            {
                session,
            },
        )
    }
}   