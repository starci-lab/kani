import { BotSchema, InjectPrimaryMongoose, SwapTransactionSchema, TokenId } from "@modules/databases"
import { ClientSession, Connection } from "mongoose"
import { DayjsService } from "@modules/mixin"
import { Injectable } from "@nestjs/common"
import { ChainId, Network } from "@modules/common"
import { BN } from "turbos-clmm-sdk"
import { WinstonLog } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"
import { InjectWinston } from "@modules/winston"

@Injectable()
export class SwapTransactionSnapshotService {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly dayjsService: DayjsService,
        @InjectWinston()
        private readonly logger: WinstonLogger,
    ) {}

    public async addSwapTransactionRecord(
        {
            amountIn,
            tokenInId,
            tokenOutId,
            txHash,
            bot,
            session,
        }: AddSwapTransactionRecordParams
    ): Promise<void> {
        await this.connection.model<SwapTransactionSchema>(SwapTransactionSchema.name)
            .create(
                [
                    {
                        tokenInId,
                        tokenOutId,
                        amountIn,
                        chainId: ChainId.Solana,
                        network: Network.Mainnet,
                        txHash,
                        bot: bot.id,
                    }
                ], {
                    session,
                })
        this.logger.info(
            WinstonLog.SwapTransactionSuccess, {
                txHash,
                bot: bot.id,
            })
    }
}   

export interface AddSwapTransactionRecordParams {
    amountIn: BN
    tokenInId: TokenId
    tokenOutId: TokenId
    txHash: string
    bot: BotSchema
    session: ClientSession
}