import { Injectable, OnModuleInit } from "@nestjs/common"
import { ModuleRef } from "@nestjs/core"
import { DataSource } from "typeorm"
import { Connection } from "mongoose"
import { envConfig, LpBotType } from "@modules/env"
import { getDataSourceToken } from "@nestjs/typeorm"
import { getConnectionToken } from "@nestjs/mongoose"
import { 
    LiquidityPoolId, 
    PositionEntity, 
    PositionLike 
} from "@modules/databases"
import { DataLikeQueryService } from "./data-like-query.service"

export interface LoadPositionParams {
    userId: string
    liquidityPoolId: LiquidityPoolId
}

export interface LoadAssignedLiquidityPoolParams {
    userId: string
    liquidityPoolId: LiquidityPoolId
}

@Injectable()
export class DataLikePositionService implements OnModuleInit {
    private sqliteDataSource: DataSource
    private mongoDbConnection: Connection
    constructor(
        private readonly moduleRef: ModuleRef,
        private readonly dataLikeQueryService: DataLikeQueryService,
    ) { }

    onModuleInit() {
        switch (envConfig().lpBot.type) {
        case LpBotType.UserBased: {
            this.mongoDbConnection = this.moduleRef.get(getConnectionToken(), { strict: false })
            break
        }
        case LpBotType.System: {
            this.sqliteDataSource = this.moduleRef.get(getDataSourceToken(), { strict: false })
            break
        }
        }
    }

    private async loadPositionFromMongo({ 
        liquidityPoolId, 
        userId
    }: LoadPositionParams): Promise<PositionLike> {
        console.log(liquidityPoolId, userId)
        throw new Error("Not implemented")
    }

    private async loadPositionFromSqlite({ 
        liquidityPoolId, 
        userId
    }: LoadPositionParams): Promise<PositionLike> {
        const position = await this.sqliteDataSource.manager.findOne(
            PositionEntity, {
                where: {
                    assignedLiquidityPool: {
                        liquidityPool: {
                            displayId: liquidityPoolId
                        },
                        userId
                    },
                },
                relations: {
                    assignedLiquidityPool: {
                        liquidityPool: true,
                    },
                }
            })
        if (!position) 
            throw new Error(`Position not found for liquidity pool ${liquidityPoolId} and user ${userId}`)
        return {
            liquidity: position.liquidity,
            tickLower: position.tickLower,
            tickUpper: position.tickUpper,
            positionId: position.positionId,
            depositAmount: position.depositAmount,
        }
    }

    public async loadPosition({ liquidityPoolId, userId }: LoadPositionParams) {
        switch (envConfig().lpBot.type) {
        case LpBotType.UserBased: {
            return await this.loadPositionFromMongo({ liquidityPoolId, userId })
        }
        case LpBotType.System: {
            return await this.loadPositionFromSqlite({ liquidityPoolId, userId })
        }
        default:
            throw new Error("Invalid LP bot type")
        }
    }
}