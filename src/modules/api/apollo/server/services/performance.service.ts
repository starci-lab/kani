import {
    InjectPrimaryMongoose,
    PositionSchema,
} from "@modules/databases"
import {
    Injectable,
} from "@nestjs/common"
import {
    Connection,
    Types,
} from "mongoose"
import {
    DayjsService,
} from "@modules/mixin"
import Decimal from "decimal.js"
import type {
    Performance24HRequest,
    Performance24HResponse,
    ProfitResult,
} from "../types"

/**
 * Service for position/performance aggregates (e.g. 24h ROI, PnL).
 *
 * @example
 * const result = await performanceService.performance24h({ botIds: ["id1"] })
 */
@Injectable()
export class PerformanceService {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly dayjsService: DayjsService,
    ) {}

    /**
     * Computes 24h performance (ROI, PnL) for the given bots.
     *
     * @param param - botIds to aggregate
     * @returns Array of performance data per bot
     */
    async performance24h(
        { botIds }: Performance24HRequest,
    ): Promise<Performance24HResponse> {
        const botObjectIds = botIds.map((id) => new Types.ObjectId(id))
        const oneDayAgo = this.dayjsService
            .now()
            .subtract(1,
                "day")
            .toDate()
        const results = await this.connection
            .model<PositionSchema>(PositionSchema.name)
            .aggregate<ProfitResult>([
                {
                    $match: {
                        bot: {
                            $in: botObjectIds,
                        },
                        isActive: false,
                        closeSnapshot: {
                            $ne: null,
                        },
                    },
                },
                {
                    $project: {
                        bot: 1,
                        snapshotAt: "$closeSnapshot.snapshotAt",
                        positionValue: {
                            $ifNull: ["$closeSnapshot.positionValue",
                                0],
                        },
                        positionValueInUsd: {
                            $ifNull: ["$closeSnapshot.positionValueInUsd",
                                0],
                        },
                    },
                },
                {
                    $sort: {
                        snapshotAt: -1,
                    },
                },
                {
                    $group: {
                        _id: "$bot",
                        positions: {
                            $push: {
                                snapshotAt: "$snapshotAt",
                                positionValue: "$positionValue",
                                positionValueInUsd: "$positionValueInUsd",
                            },
                        },
                    },
                },
                {
                    $project: {
                        latest: {
                            $arrayElemAt: ["$positions",
                                0],
                        },
                        prev: {
                            $arrayElemAt: [
                                {
                                    $filter: {
                                        input: "$positions",
                                        as: "p",
                                        cond: {
                                            $lte: ["$$p.snapshotAt",
                                                oneDayAgo],
                                        },
                                    },
                                },
                                0,
                            ],
                        },
                    },
                },
            ],
            )
        return results.map(({ _id, latest, prev }) => {
            const latestValue = new Decimal(latest?.positionValue ?? 1)
            const prevValue = new Decimal(prev?.positionValue ?? 1)

            const latestInUsd = new Decimal(latest?.positionValueInUsd ?? 1)
            const prevInUsd = new Decimal(prev?.positionValueInUsd ?? 1)

            return {
                id: _id.toString(),
                roi: latestValue.div(prevValue).sub(1),
                roiInUsd: latestInUsd.div(prevInUsd).sub(1),
                pnl: latestValue.sub(prevValue),
                pnlInUsd: latestInUsd.sub(prevInUsd),
            }
        })
    }
}
