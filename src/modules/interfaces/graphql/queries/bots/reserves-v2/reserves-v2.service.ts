import { Injectable } from "@nestjs/common"
import {
    InjectPrimaryMongoose,
    BotSchema,
    PositionSchema,
    PrimaryMemoryStorageService,
    UserSchema,
} from "@modules/databases"
import { Connection } from "mongoose"
import {
    ReservesV2Request,
    ReservesV2ResponseData,
} from "./reserves-v2.dto"
import { VerifyAccessTokenResponse } from "@privy-io/node"
import { 
    ActivePositionNotFoundException, 
    BotNotFoundException, 
    BotNotOwnedByUserException, 
    LiquidityPoolNotFoundException,
    UserNotFoundException,
} from "@modules/exceptions"
import { ReservesOrchestratorService } from "@modules/blockchains"

@Injectable()
export class ReservesV2Service {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly reservesOrchestratorService: ReservesOrchestratorService,
    ) { }

    async reservesV2(
        {
            botId,
            activePositionId,
        }: ReservesV2Request,
        response: VerifyAccessTokenResponse,
    ): Promise<ReservesV2ResponseData> {
        // retrieve the user from the response
        const user = await this.connection
            .model<UserSchema>(UserSchema.name)
            .findOne({ privyUserId: response.user_id })
        if (!user) {
            throw new UserNotFoundException("User not found with privy user id: " + response.user_id)
        }
        const bot = await this.connection.model<BotSchema>(BotSchema.name).findById(botId)
        if (!bot) {
            throw new BotNotFoundException(`Bot not found with id: ${botId}`)
        }
        // check if the bot is owned by the user
        if (bot.user.toString() !== user.id) {
            throw new BotNotOwnedByUserException(`Bot not owned by user with id: ${user.id}`)
        }
        // check if the active position exists and is owned by the bot
        const activePosition = await this.connection.model<PositionSchema>(PositionSchema.name).findById(activePositionId)
        if (
            !activePosition 
            || activePosition.bot.toString() !== botId
            || !activePosition.isActive
        ) {
            throw new ActivePositionNotFoundException("Active position not found")
        }
        bot.activePosition = activePosition
        // retrieve the liquidity pool
        const liquidityPool = this.primaryMemoryStorageService.liquidityPools.find(
            liquidityPool => liquidityPool.id === activePosition.liquidityPool.toString(),
        )
        if (!liquidityPool) {
            throw new LiquidityPoolNotFoundException("Liquidity pool not found")
        }
        const reserves = await this.reservesOrchestratorService.reserves({
            bot,
            liquidityPoolId: liquidityPool.displayId,
        })
        return {
            tokenA: reserves.tokenA.toNumber(),
            tokenB: reserves.tokenB.toNumber(),
            lastSnapshotAt: reserves.snapshotAt.toDate(),
        }
    }
}

