import { 
    BotSchema, 
    InjectPrimaryMongoose, 
    TransactionSchema, 
    TokenId,
    TransactionType
} from "@modules/databases"
import { ClientSession, Connection } from "mongoose"
import { Injectable } from "@nestjs/common"
import { ChainId } from "@typedefs"
import { BN } from "turbos-clmm-sdk"

@Injectable()
export class TransactionSnapshotService {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
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
        await this.connection.model<TransactionSchema>(TransactionSchema.name)
            .create(
                [
                    {
                        metadata: {
                            tokenIn: tokenInId,
                            tokenOut: tokenOutId,
                            amountIn: amountIn.toString(),
                        },
                        type: TransactionType.Swap,
                        chainId: ChainId.Solana,
                        txHash,
                        bot: bot.id,
                    }
                ], {
                    session,
                })
    }

    public async addOpenPositionRecord(
        {
            bot,
            session,
            txHash,
        }: AddOpenPositionTransactionRecordParams
    ): Promise<void> {
        await this.connection.model<TransactionSchema>(TransactionSchema.name)
            .create(
                [
                    {
                        type: TransactionType.OpenPosition,
                        chainId: ChainId.Solana,
                        txHash,
                        bot: bot.id,
                    }
                ], {
                    session,
                })
    }

    public async addClosePositionTransactionRecord(
        {
            bot,
            session,
            txHash,
        }: AddClosePositionTransactionRecordParams
    ): Promise<void> {
        await this.connection.model<TransactionSchema>(TransactionSchema.name)
            .create(
                [
                    {
                        type: TransactionType.ClosePosition,
                        chainId: ChainId.Solana,
                        txHash,
                        bot: bot.id,
                    }
                ], {
                    session,
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

export interface AddOpenPositionTransactionRecordParams {
    bot: BotSchema
    session: ClientSession
    txHash: string
}

export interface AddClosePositionTransactionRecordParams {
    bot: BotSchema
    session: ClientSession
    txHash: string
}