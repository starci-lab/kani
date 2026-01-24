import {
    Injectable 
} from "@nestjs/common"
import {
    ClientSession, Connection 
} from "mongoose"
import { 
    BotSchema, 
    InjectPrimaryMongoose, 
    LiquidityPoolSchema, 
    PositionFeesSchema, 
    PositionSchema, 
    PositionSnapshotsSchema,
    TokenSchema
} from "@modules/databases"
import BN from "bn.js"
import {
    DayjsService 
} from "@modules/mixin"
import {
    PositionValueService 
} from "../math"

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
            feeAmountTarget,
            feeAmountQuote,
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
                tickLower: clmmParams.tickLower.toNumber(),
                tickUpper: clmmParams.tickUpper.toNumber(),
            }
            : undefined
        // Build DLMM state if applicable
        const dlmmState = dlmmParams
            ? {
                minBinId: dlmmParams.minBinId.toNumber(),
                maxBinId: dlmmParams.maxBinId.toNumber(),
            }
            : undefined
        // Build open snapshot using before snapshot (snapshot before opening position)
        const { positionValue, positionValueInUsd } = await this.positionValueService.calculatePositionValue({
            before,
            after: stimulate ? {
                targetBalanceAmount: new BN(0),
                quoteBalanceAmount: new BN(0),
                gasBalanceAmount: new BN(0),
            } : after,
            targetToken,
            quoteToken,
            gasToken,
        })
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
            feeAmountTarget: feeAmountTarget.toString(),
            feeAmountQuote: feeAmountQuote.toString(),
        }

        const targetIsA = liquidityPool.tokenA.toString() === targetToken.id.toString()
        const [positionRaw] = await this.connection.model<PositionSchema>(
            PositionSchema.name
        ).create(
            [
                {
                    bot: bot.id,
                    chainId: bot.chainId,
                    targetIsA,
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

export interface AddOpenPositionRecordParams {
    // Protocol-specific params
    clmmParams?: ClmmSnapshotParams
    dlmmParams?: DlmmSnapshotParams
    // Snapshot fields
    before: BalanceSnapshotParams
    after: BalanceSnapshotParams
    // Common fields
    bot: BotSchema
    liquidityPool: LiquidityPoolSchema
    positionId: string
    openTxHash: string
    metadata?: unknown
    feeAmountTarget: BN
    feeAmountQuote: BN
    session?: ClientSession
    targetToken: TokenSchema
    quoteToken: TokenSchema
    gasToken: TokenSchema
    stimulate?: boolean
}

export interface BalanceSnapshotParams {
    targetBalanceAmount: BN
    quoteBalanceAmount: BN
    gasBalanceAmount: BN
}

export interface ClmmSnapshotParams {
    liquidity: BN
    tickLower: BN
    tickUpper: BN
}

export interface DlmmSnapshotParams {
    minBinId: BN
    maxBinId: BN
}