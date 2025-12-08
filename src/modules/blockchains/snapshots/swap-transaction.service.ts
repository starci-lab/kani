import { 
    BotSchema, 
    InjectPrimaryMongoose, 
    SwapTransactionSchema, 
    TokenId 
} from "@modules/databases"
import { ClientSession, Connection } from "mongoose"
import { Injectable } from "@nestjs/common"
import { ChainId, Network } from "@typedefs"
import { BN } from "turbos-clmm-sdk"

@Injectable()
export class SwapTransactionSnapshotService {
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