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
    PositionPerformanceSchema
} from "@modules/databases"
import BN from "bn.js"
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
    UpdateClosePositionRecordParams
} from "./types"

@Injectable()
export class ClosePositionSnapshotService {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly dayjsService: DayjsService,
        private readonly positionValueService: PositionValueService,
    ) {}

    async updateClosePositionRecord(
        {
            before,
            after,
            positionId,
            closeTxHash,
            targetToken,
            quoteToken,
            gasToken,
            session,
            stimulate,
        }: UpdateClosePositionRecordParams
    ) {
        const now = this.dayjsService.now().toDate()
        
        // Get the position to access openSnapshot for ROI/PnL calculation
        const position = await this.connection.model<PositionSchema>(
            PositionSchema.name
        ).findById(positionId).session(session || null)
        
        if (!position) {
            throw new Error(`Position with id ${positionId} not found`)
        }

        const oneMillion = new BN("1000000000")
        // Build close snapshot using after snapshot (snapshot after closing position)
        const _after = stimulate ? {
            targetBalanceAmount: oneMillion,
            quoteBalanceAmount: oneMillion,
            gasBalanceAmount: oneMillion,
        } : after
        const { 
            positionValue, 
            positionValueInUsd, 
            balanceValue, 
            balanceValueInUsd 
        } = await this.positionValueService.calculatePositionValue(
            {
                before,
                after: _after,
                targetToken,
                quoteToken,
                gasToken,
            }
        )   
        const closeSnapshot: Partial<PositionSnapshotsSchema> = {
            targetBalanceAmount: _after.targetBalanceAmount.toString(),
            quoteBalanceAmount: _after.quoteBalanceAmount.toString(),
            gasBalanceAmount: _after.gasBalanceAmount.toString(),
            positionValue: positionValue.toNumber(),
            positionValueInUsd: positionValueInUsd.toNumber(),
            balanceValue: balanceValue.toNumber(),
            balanceValueInUsd: balanceValueInUsd.toNumber(),
            snapshotAt: now,
        }
        // Calculate ROI and PnL from open and close snapshots
        const openPositionValue = new Decimal(position.openSnapshot?.positionValue ?? 0)
        const openPositionValueUsd = new Decimal(position.openSnapshot?.positionValueInUsd ?? 0)
        // ROI = (closePositionValue - openPositionValue) / openPositionValue * 100
        const roi = positionValue.sub(openPositionValue).div(openPositionValue).mul(100).toNumber()
        // PnL = closePositionValue - openPositionValue
        const pnl = positionValue.sub(openPositionValue).toNumber()
        // ROI in USD = (closePositionValueUsd - openPositionValueUsd) / openPositionValueUsd * 100
        const roiUsd = positionValueInUsd.sub(openPositionValueUsd).div(openPositionValueUsd).mul(100).toNumber()
        // PnL in USD = closePositionValueUsd - openPositionValueUsd
        const pnlUsd = positionValueInUsd.sub(openPositionValueUsd).toNumber()
        // Calculate performance
        const performance: PositionPerformanceSchema = {
            roi,
            pnl,
            roiUsd,
            pnlUsd,
        }
        await this.connection.model<PositionSchema>(
            PositionSchema.name
        ).updateOne({
            _id: positionId,
        },
        {
            $set: {
                closeTxHash,
                isActive: false,
                closeSnapshot,
                performance,
            },
        }, 
        {
            session,
        })
    }
}   