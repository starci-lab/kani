import { InjectPrimaryMongoose, PositionSchema } from "@modules/databases"
import { Injectable } from "@nestjs/common"
import { Connection, Types } from "mongoose"
import { DayjsService } from "@modules/mixin"
import Decimal from "decimal.js"

@Injectable()
export class ProfitService {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly dayjsService: DayjsService,
    ) { }

    async profit24h(
        {
            botIds
        }: Profit24Request,
    ): Promise<Profit24Response> {
        const botObjectIds = botIds.map(id => new Types.ObjectId(id))
        // roi is computed over 1 day
        const oneDayAgo = this.dayjsService.now().subtract(1, "day").toDate()
        // get the positions
        const positions = await this.connection
            .model<PositionSchema>(PositionSchema.name)
            .aggregate<ProfitResult>(
                [
                    {
                        $match: {
                            bot: { $in: botObjectIds },
                            positionClosedAt: { $ne: null },
                        },
                    },
                    {
                        $project: {
                            bot: 1,
                            positionOpenedAt: 1,
                            positionValueAtClose: 1,
                            positionValueAtOpen: 1,
                        },
                    },
                    { 
                        $sort: { 
                            positionOpenedAt: -1 
                        } 
                    },
                    {
                        $group: {
                            _id: "$bot",
                            positions: {
                                $push: {
                                    positionOpenedAt: "$positionOpenedAt",
                                    positionValueAtClose: {
                                        $ifNull: ["$positionValueAtClose", 0],
                                    },
                                    positionValueAtOpen: {
                                        $ifNull: ["$positionValueAtOpen", 0],
                                    },
                                },
                            },
                        },
                    },
                    {
                        $project: {
                            latest: { $arrayElemAt: ["$positions", 0] },
                            prev: {
                                $arrayElemAt: [
                                    {
                                        $filter: {
                                            input: "$positions",
                                            as: "p",
                                            cond: { $lte: ["$$p.positionOpenedAt", oneDayAgo] },
                                        },
                                    },
                                    0,
                                ],
                            },
                        },
                    },
                ]
            )
        // compute the profit
        return positions.map(({ _id, latest, prev }) => {
            const roi24h = new Decimal(latest?.positionValueAtClose ?? 1).div(prev?.positionValueAtClose ?? 1).sub(1).toNumber()
            const pnl24h = new Decimal(latest?.positionValueAtClose ?? 1).sub(prev?.positionValueAtClose ?? 1).toNumber()
            return {
                id: _id.toString(),
                roi24h,
                pnl24h,
            }
        })
    }
}

export interface Profit24Request {
    botIds: Array<string>
}

export interface ProfitResult {
    _id: Types.ObjectId
    latest: ProfitPosition
    prev: ProfitPosition
}


export interface ProfitPosition {
    positionOpenedAt: Date
    positionValueAtClose: number
    positionValueAtOpen: number
}

export interface Profit24ResponseData {
    id: string
    roi24h: number
    pnl24h: number
}
export type Profit24Response = Array<Profit24ResponseData> 