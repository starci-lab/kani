import {
    Injectable 
} from "@nestjs/common"
import {
    Connection 
} from "mongoose"
import { 
    BotSchema, 
    InjectPrimaryMongoose, 
    PositionFeesSchema, 
    PositionSchema, 
    PositionSnapshotsSchema
} from "@modules/databases"
import BN from "bn.js"
import {
    DayjsService 
} from "@modules/mixin"
import {
    PositionValueService 
} from "../math"
import {
    AddOpenPositionRecordParams
} from "./types"

@Injectable()
export class OpenPositionSnapshotService {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly dayjsService: DayjsService,
        private readonly positionValueService: PositionValueService,
    ) {}

    async addOpenPositionRecord(
        {
            before,
            after,
            clmmParams,
            dlmmParams,
            bot,
            liquidityPool,
            positionId,
            openTxHash,
            metadata,
            session,
            feeTargetAmount,
            feeQuoteAmount,
            targetToken,
            quoteToken,
            gasToken,
            stimulate,
        }: AddOpenPositionRecordParams
    ) {
        const now = this.dayjsService.now().toDate()
        // Build CLMM state if applicable
        const clmmState = clmmParams
            ? {
                liquidity: clmmParams.liquidity.toString(),
                tickLower: clmmParams.tickLower.toString(),
                tickUpper: clmmParams.tickUpper.toString(),
            }
            : undefined
        // Build DLMM state if applicable
        const dlmmState = dlmmParams
            ? {
                minBinId: dlmmParams.minBinId.toString(),
                maxBinId: dlmmParams.maxBinId.toString(),
            }
            : undefined
        // Build open snapshot using before snapshot (snapshot before opening position)
        const { positionValue, positionValueInUsd } = await this.positionValueService.calculatePositionValue(
            {
                before,
                after: stimulate ? {
                    targetBalanceAmount: new BN(0),
                    quoteBalanceAmount: new BN(0),
                    gasBalanceAmount: new BN(0),
                } : after,
                targetToken,
                quoteToken,
                gasToken,
            }
        )
        const openSnapshot: Partial<PositionSnapshotsSchema> = {
            targetBalanceAmount: before.targetBalanceAmount.toString(),
            quoteBalanceAmount: before.quoteBalanceAmount.toString(),
            gasBalanceAmount: before.gasBalanceAmount.toString(),
            positionValue: positionValue.toNumber(),
            positionValueInUsd: positionValueInUsd.toNumber(),
            snapshotAt: now,
        }
        // Build fees object (required field)
        const fees: Partial<PositionFeesSchema> = {
            targetAmount: feeTargetAmount.toString(),
            quoteAmount: feeQuoteAmount.toString(),
        }
        const [positionRaw] = await this.connection.model<PositionSchema>(
            PositionSchema.name
        ).create(
            [
                {
                    bot: bot.id,
                    chainId: bot.chainId,
                    liquidityPool: liquidityPool.id,
                    positionId,
                    openTxHash,
                    isActive: true,
                    metadata,
                    clmmState,
                    dlmmState,
                    openSnapshot,
                    fees,
                }
            ],
            {
                session,
            }
        )
        const position = positionRaw.toJSON<PositionSchema>()
        await this.connection.model<BotSchema>(BotSchema.name).updateOne(
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
    }
}