import {
    Injectable
} from "@nestjs/common"
import {
    Connection
} from "mongoose"
import {
    BotSchema,
    InjectPrimaryMongoose,
    PositionSchema,
    PositionSnapshotsSchema
} from "@modules/databases"
import {
    DayjsService
} from "@modules/mixin"
import {
    PositionValueService
} from "../math"
import {
    AddOpenPositionRecordParams,
    AddOpenPositionRecordResult
} from "./types"
import {
    strict as assert 
} from "node:assert"
    
/**
 * Service responsible for creating open-position snapshot records.
 *
 * @example
 * await openPositionSnapshotService.addOpenPositionRecord({ before, after, bot, liquidityPool, ... })
 */
@Injectable()
export class OpenPositionSnapshotService {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly dayjsService: DayjsService,
        private readonly positionValueService: PositionValueService,
    ) {}

    /**
     * Adds an open-position record with balance snapshots and protocol state (CLMM/DLMM).
     *
     * @param param - Open position params (before/after balances, pool, tokens, fees, etc.)
     * @returns Resolves when the position and bot activePosition are persisted
     *
     * @example
     * await service.addOpenPositionRecord({ before, after, bot, liquidityPool, positionId, openTxHashes, ... })
     */
    async addOpenPositionRecord(
        {
            before,
            after,
            clmmParams,
            dlmmParams,
            bot,
            liquidityPool,
            positionId,
            openTxHashes,
            metadata,
            session,
            targetToken,
            quoteToken,
            gasToken,
            rentAmount,
        }: AddOpenPositionRecordParams
    ): Promise<AddOpenPositionRecordResult> {
        const now = this.dayjsService.now().toDate()

        // build CLMM state when provided
        const clmmState = clmmParams
            ? {
                liquidity: clmmParams.liquidity.toString(),
                tickLower: clmmParams.tickLower.toString(),
                tickUpper: clmmParams.tickUpper.toString(),
            }
            : undefined

        // build DLMM state when provided
        const dlmmState = dlmmParams
            ? {
                minBinId: dlmmParams.minBinId.toString(),
                maxBinId: dlmmParams.maxBinId.toString(),
            }
            : undefined

        // compute position and balance values from before/after snapshots
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

        // build open snapshot from before-balance and computed values
        const openSnapshot: Partial<PositionSnapshotsSchema> = {
            targetBalanceAmount: before.targetBalanceAmount.toString(),
            quoteBalanceAmount: before.quoteBalanceAmount.toString(),
            gasBalanceAmount: before.gasBalanceAmount.toString(),
            positionValue: positionValue.toNumber(),
            positionValueInUsd: positionValueInUsd.toNumber(),
            balanceValue: balanceValue.toNumber(),
            balanceValueInUsd: balanceValueInUsd.toNumber(),
            snapshotAt: now,
        }

        // create position document with open snapshot and protocol state
        const [positionRaw] = await this.connection.model<PositionSchema>(
            PositionSchema.name
        ).create(
            [
                {
                    bot: bot.id,
                    chainId: bot.chainId,
                    liquidityPool: liquidityPool.id,
                    positionId,
                    openTxHashes,
                    isActive: true,
                    metadata,
                    clmmState,
                    dlmmState,
                    openSnapshot,
                    rentAmount: rentAmount?.toString(),
                }
            ],
            {
                session,
            }
        )
        const position = positionRaw.toJSON<PositionSchema>()
        // set bot activePosition to new position
        const updateBotResult = await this.connection.model<BotSchema>(BotSchema.name).updateOne(
            {
                _id: bot.id
            },
            {
                $set: {
                    activePosition: {
                        liquidityPool: liquidityPool.id,
                        position: position.id,
                        type: liquidityPool.type,
                    },
                },
            },
            {
                session,
            }
        )
        assert(updateBotResult.matchedCount > 0)
    }
}