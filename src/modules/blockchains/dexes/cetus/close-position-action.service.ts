import { Injectable } from "@nestjs/common"
import {
    ExecuteClosePositionParams,
    IClosePositionActionService,
    LiquidityPoolState,
    PrepareClosePositionParams,
    PrepareClosePositionResponse,
} from "../../interfaces"
import { Transaction } from "@mysten/sui/transactions"
import { SignerService } from "../../signers"
import { 
    PrimaryMemoryStorageService
} from "@modules/databases"
import { 
    ClosePositionTxbService, 
} from "./transactions"
import { 
    ActivePositionNotFoundException,
    InvalidPoolTokensException, 
    TokenNotFoundException, 
    TransactionNotPreparedException,
} from "@exceptions"
import { RpcExecutorService } from "@modules/blockchains"
import { RpcAccessType } from "@modules/filesystem"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"
import Decimal from "decimal.js"

@Injectable()
export class CetusClosePositionActionService implements IClosePositionActionService {
    constructor(
    private readonly signerService: SignerService,
    private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    private readonly closePositionTxbService: ClosePositionTxbService,
    private readonly rpcExecutorService: RpcExecutorService,
    @InjectWinston()
    private readonly logger: WinstonLogger,
    ) {}


    async prepare(
        { bot, state }: PrepareClosePositionParams
    ): Promise<PrepareClosePositionResponse> {
        const _state = state as LiquidityPoolState
        const txb = new Transaction()
        if (!bot.activePosition) {
            throw new ActivePositionNotFoundException(
                bot.id, 
                "Active position not found"
            )
        }
        const {
            txb: closePositionTxb,
        } = await this.closePositionTxbService.createClosePositionTxb({
            txb,
            bot,
            state: _state,
        })
        const txHash = await closePositionTxb.getDigest()
        return {
            txHash,
            txb: closePositionTxb,
        }   
    }

    async execute(
        params: ExecuteClosePositionParams
    ): Promise<void> {
        const { bot } = params
        if (!bot.activePosition) 
        {
            throw new ActivePositionNotFoundException(
                bot.id, 
                "Active position not found"
            )
        }
        const targetToken = this.primaryMemoryStorageService.tokens.find(
            (token) => token.id === bot.targetToken.toString()
        )
        if (!targetToken) {
            throw new TokenNotFoundException("Target token not found")
        }
        const quoteToken = this.primaryMemoryStorageService.tokens.find(
            (token) => token.id === bot.quoteToken.toString()
        )
        if (!quoteToken) {
            throw new TokenNotFoundException("Quote token not found")
        }
        // we have many close criteria
        // 1. the position is out-of-range, we close immediately
        // 2. our detection find a potential dump from CEX
        // 3. the position is not profitable, we close it  
        const shouldProceedAfterIsPositionOutOfRange = await this.assertIsPositionOutOfRange(params)
        if (shouldProceedAfterIsPositionOutOfRange) {
            return
        }
    }

    private async assertIsPositionOutOfRange(
        params: ExecuteClosePositionParams
    ): Promise<boolean> {
        const { state, bot } = params
        if (!bot.activePosition) {
            throw new ActivePositionNotFoundException(
                bot.id, 
                "Active position not found"
            )
        }
        const _state = state as LiquidityPoolState
        const tokenA = this.primaryMemoryStorageService.tokens
            .find((token) => token.id === _state.static.tokenA.toString())
        const tokenB = this.primaryMemoryStorageService.tokens
            .find((token) => token.id === _state.static.tokenB.toString())
        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException("Either token A or token B is not in the pool")
        }
        if (
            new Decimal(_state.dynamic.tickCurrent).gte(bot.activePosition.tickLower || 0)
            && new Decimal(_state.dynamic.tickCurrent).lte(bot.activePosition.tickUpper || 0)
        ) {
            // do nothing, since the position is still in the range
            // return true to continue the assertion
            return false
        }
        await this.proccessClosePositionTransaction(params)
        return true
    }

    private async proccessClosePositionTransaction(
        {
            bot,
            state,
            isRetry,
            txb,
            txHash,
        }: ExecuteClosePositionParams
    ): Promise<void> {
        const _state = state as LiquidityPoolState
        await this.rpcExecutorService.withSuiClient({
            accessType: RpcAccessType.Write,
            callback: async ({ suiClient }) => {
                // sign the transaction
                return await this.signerService.withSuiSigner({
                    bot,
                    action: async (signer) => {
                        if (isRetry) {
                            const transactionExisted = await suiClient.getTransactionBlock({
                                digest: txHash,
                            })
                            if (transactionExisted) {
                                return
                            }
                        }
                        if (!txb) {
                            throw new TransactionNotPreparedException("Transaction not prepared")
                        }
                        const { digest } = await suiClient.signAndExecuteTransaction({
                            transaction: txb,
                            signer,
                            options: {
                                showEvents: true,
                            }
                        })
                        await suiClient.waitForTransaction({
                            digest,
                        })
                        this.logger.verbose(
                            WinstonLog.ClosePositionSuccess, {
                                botId: bot.id,
                                txHash: txHash,
                                liquidityPoolId: _state.static.displayId,
                            }
                        )
                    },
                })
            },
        })
    }
}