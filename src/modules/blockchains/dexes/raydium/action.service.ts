import { Injectable } from "@nestjs/common"
import { ClosePositionParams, IActionService, OpenPositionParams } from "../../interfaces"
import { PoolUtils, Raydium, TxVersion } from "@raydium-io/raydium-sdk-v2"
import { Connection } from "mongoose"
import {
    InjectPrimaryMongoose,
} from "@modules/databases"
import { SignerService } from "../../signers"
import { PrimaryMemoryStorageService } from "@modules/databases"
import { 
    ActivePositionNotFoundException,
    InvalidPoolTokensException, 
    LiquidityAmountsNotAcceptableException,
    SnapshotBalancesNotSetException,
    TransactionMessageTooLargeException,
} from "@exceptions"
import { TickMathService } from "../../math"
import { Network } from "@typedefs"
import { RAYDIUM_CLIENTS_INDEX } from "./constants"
import { InjectSolanaClients, OPEN_POSITION_SLIPPAGE } from "@modules/blockchains"
import { HttpAndWsClients } from "../../clients"
import { PublicKey, Connection as SolanaConnection } from "@solana/web3.js"
import { 
    createSolanaRpc,
    createKeyPairFromBytes,
    signTransaction,
    getBase64EncodedWireTransaction,
    pipe,
    addSignersToTransactionMessage,
    createSignerFromKeyPair,
    setTransactionMessageFeePayerSigner,
    setTransactionMessageLifetimeUsingBlockhash,
    isTransactionMessageWithinSizeLimit,
    compileTransaction,
    assertIsSendableTransaction,
    assertIsTransactionWithinSizeLimit,
    sendAndConfirmTransactionFactory,
    createSolanaRpcSubscriptions,
    getSignatureFromTransaction,
    createTransactionMessage,
    appendTransactionMessageInstructions,
} from "@solana/kit"

import { InjectRaydiumClmmSdk } from "./raydium.decorators"
import BN from "bn.js"
import { fromVersionedTransaction } from "@solana/compat"
import { Decimal } from "decimal.js"
import { TransactionWithLifetime } from "../../types"
import { EnsureMathService } from "../../math"
import { BalanceService } from "../../balance"
import { BalanceSnapshotService, ClosePositionSnapshotService, OpenPositionSnapshotService } from "../../snapshots"
import { ClosePositionInstructionService } from "./transactions"
import { httpsToWss } from "@utils"

@Injectable()
export class RaydiumActionService implements IActionService {
    constructor(
        @InjectRaydiumClmmSdk()
        private readonly raydiumClmmSdk: Raydium,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        @InjectSolanaClients()
        private readonly solanaClients: Record<Network, HttpAndWsClients<SolanaConnection>>,
        private readonly signerService: SignerService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly tickMathService: TickMathService,
        private readonly ensureMathService: EnsureMathService,
        private readonly balanceService: BalanceService,
        private readonly balanceSnapshotService: BalanceSnapshotService,
        private readonly openPositionSnapshotService: OpenPositionSnapshotService,
        private readonly closePositionSnapshotService: ClosePositionSnapshotService,
        private readonly closePositionInstructionService: ClosePositionInstructionService,
    ) { }

    async closePosition(
        params: ClosePositionParams
    ): Promise<void> {
        const {
            bot,
        } = params
        if (!bot.activePosition) 
        {
            throw new ActivePositionNotFoundException(
                bot.id, 
                "Active position not found"
            )
        }
        // we have many close conditions
        // 1. the position is out-of-range, we close immediately
        // 2. our detection find a potential dump from CEX
        // 3. the position is not profitable, we close it  
        const shouldProceedAfterIsPositionOutOfRange = await this.assertIsPositionOutOfRange(params)
        if (!shouldProceedAfterIsPositionOutOfRange) {
            return
        }
    }

    private async assertIsPositionOutOfRange(
        {
            bot,
            state
        }: ClosePositionParams
    ): Promise<boolean> {
        if (!bot.activePosition) {
            throw new ActivePositionNotFoundException(
                bot.id, 
                "Active position not found"
            )
        }
        if (
            new Decimal(state.dynamic.tickCurrent).gte(bot.activePosition.tickLower) 
            && new Decimal(state.dynamic.tickCurrent).lte(bot.activePosition.tickUpper)
        ) {
            // do nothing, since the position is still in the range
            // return true to continue the assertion
            return true
        }
        const tokenA = this.primaryMemoryStorageService.tokens
            .find((token) => token.id === state.static.tokenA.toString())
        const tokenB = this.primaryMemoryStorageService.tokens
            .find((token) => token.id === state.static.tokenB.toString())
        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException("Either token A or token B is not in the pool")
        }
        const targetIsA = bot.targetToken.id === state.static.tokenA.toString()
        await this.proccessClosePositionTransaction({
            bot,
            state,
            tokenAId: tokenA.displayId,
            tokenBId: tokenB.displayId,
            targetIsA,
        })
        // return false to terminate the assertion
        return false
    }

    private async proccessClosePositionTransaction(
        {
            bot,
            state
        }: ClosePositionParams
    ): Promise<void> {
        if (!bot.activePosition) {
            throw new ActivePositionNotFoundException(
                bot.id, 
                "Active position not found"
            )
        }
        const network = Network.Mainnet
        const client = this.solanaClients[network].http[RAYDIUM_CLIENTS_INDEX]
        const rpc = createSolanaRpc(client.rpcEndpoint)
        const rpcSubscriptions = createSolanaRpcSubscriptions(httpsToWss(client.rpcEndpoint))
        // check if the tokens are in the pool
        const tokenA = this.primaryMemoryStorageService.tokens
            .find((token) => token.id === state.static.tokenA.toString())
        const tokenB = this.primaryMemoryStorageService.tokens
            .find((token) => token.id === state.static.tokenB.toString())
        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException("Either token A or token B is not in the pool")
        }
        const closePositionInstructions = await this.closePositionInstructionService.createCloseInstructions({
            bot,
            state,
            clientIndex: RAYDIUM_CLIENTS_INDEX,
        })
        // sign the transaction
        const txHash = await this.signerService.withSolanaSigner({
            bot,
            accountAddress: bot.accountAddress,
            network,
            action: async (signer) => {
                const keyPair = await createKeyPairFromBytes(signer.secretKey)
                const kitSigner = await createSignerFromKeyPair(keyPair)
                const { value: latestBlockhash } = await rpc.getLatestBlockhash().send()
                const transactionMessage = pipe(
                    createTransactionMessage({ version: 0 }),
                    (tx) => addSignersToTransactionMessage([kitSigner], tx),
                    (tx) => setTransactionMessageFeePayerSigner(kitSigner, tx),
                    (tx) => appendTransactionMessageInstructions(closePositionInstructions, tx),
                    (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
                )
                if (!isTransactionMessageWithinSizeLimit(transactionMessage)) {
                    throw new TransactionMessageTooLargeException("Transaction message is too large")
                }
                const transaction = compileTransaction(transactionMessage)
                // sign the transaction
                const signedTransaction = await signTransaction(
                    [keyPair],
                    transaction,
                )
                assertIsSendableTransaction(signedTransaction)
                assertIsTransactionWithinSizeLimit(signedTransaction)
                // const sendAndConfirmTransaction = sendAndConfirmTransactionFactory({
                //     rpc,
                //     rpcSubscriptions,
                // })
                //const transactionSignature = getSignatureFromTransaction(signedTransaction)
                // await sendAndConfirmTransaction(
                //     signedTransaction, {
                //         commitment: "confirmed",
                //     })
                // return transactionSignature.toString()
                const simulateTransactionResponse = await rpc.simulateTransaction(
                    getBase64EncodedWireTransaction(signedTransaction), {
                        encoding: "base64",
                    }
                ).send()
                console.log("simulateTransactionResponse", simulateTransactionResponse.value.logs)
                return "abc"
            },
        })

        const {
            quoteBalanceAmount: adjustedQuoteBalanceAmount,
            targetBalanceAmount: adjustedTargetBalanceAmount,
            gasBalanceAmount: adjustedGasBalanceAmount,
        } = await this.balanceService.fetchBalances({
            bot,
        })
        const session = await this.connection.startSession()
        await session.withTransaction(
            async () => {
                if (!bot.activePosition) {
                    throw new ActivePositionNotFoundException(
                        bot.id, 
                        "Active position not found"
                    )
                }
                await this.balanceSnapshotService.updateBotSnapshotBalancesRecord({
                    bot,
                    targetBalanceAmount: adjustedTargetBalanceAmount,
                    quoteBalanceAmount: adjustedQuoteBalanceAmount,
                    gasAmount: adjustedGasBalanceAmount,
                    session,
                })
                await this.closePositionSnapshotService.updateClosePositionTransactionRecord({
                    bot,
                    pnl: new Decimal(0),
                    roi: new Decimal(0),
                    positionId: bot.activePosition.id,
                    closeTxHash: txHash,
                    targetAmountReturned: new BN(adjustedTargetBalanceAmount).sub(new BN(bot.snapshotTargetBalanceAmount || 0)),
                    quoteAmountReturned: new BN(adjustedQuoteBalanceAmount).sub(new BN(bot.snapshotQuoteBalanceAmount || 0)),
                    gasAmountReturned: adjustedGasBalanceAmount,
                    feePaidAmount: bot.activePosition.feePaidAmount ? new BN(bot.activePosition.feePaidAmount) : undefined,
                    session,
                })
            })
    }

    async openPosition(
        {
            targetIsA,
            state,
            network = Network.Mainnet,
            bot,
            slippage
        }: OpenPositionParams
    ) {
        const {
            snapshotTargetBalanceAmount,
            snapshotQuoteBalanceAmount,
            snapshotGasBalanceAmount
        } = bot
        if (!snapshotTargetBalanceAmount || !snapshotQuoteBalanceAmount) {
            throw new SnapshotBalancesNotSetException("Snapshot balances not set")
        }
        const client = this.solanaClients[network].http[RAYDIUM_CLIENTS_INDEX]
        const rpc = createSolanaRpc(client.rpcEndpoint)
        slippage = slippage || OPEN_POSITION_SLIPPAGE
        // check if the tokens are in the pool
        const tokenA = this.primaryMemoryStorageService.tokens
            .find((token) => token.id === state.static.tokenA.toString())
        const tokenB = this.primaryMemoryStorageService.tokens
            .find((token) => token.id === state.static.tokenB.toString())
        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException("Either token A or token B is not in the pool")
        }
        // get the tick bounds
        const { 
            tickLower, 
            tickUpper
        } = await this.tickMathService.getTickBounds({
            state,
            bot,
        })
        this.raydiumClmmSdk.setOwner(new PublicKey(bot.accountAddress))
        await this.raydiumClmmSdk.account.fetchWalletTokenAccounts()
        const { 
            poolInfo, 
            poolKeys,
        } = await this.raydiumClmmSdk.clmm.getPoolInfoFromRpc(state.static.poolAddress)
        
        const epochInfo = await this.raydiumClmmSdk.fetchEpochInfo()
        const res = await PoolUtils.getLiquidityAmountOutFromAmountIn({
            poolInfo,
            slippage: slippage.toNumber(),
            inputA: true,
            tickUpper: Decimal.max(tickUpper, tickLower).toNumber(),
            tickLower: Decimal.min(tickUpper, tickLower).toNumber(),
            amount: new BN(snapshotTargetBalanceAmount),
            add: true,
            amountHasFee: true,
            epochInfo,
        })
        const actualQuoteAmount = targetIsA ? res.amountB.amount : res.amountA.amount
        const ensureQuoteTokenResponse = this.ensureMathService.ensureBetween({
            actual: actualQuoteAmount,
            expected: new BN(snapshotQuoteBalanceAmount),
            upperBound: new Decimal(1),
            lowerBound: new Decimal(0.98),
        })
        if (!ensureQuoteTokenResponse.isAcceptable) {
            throw new LiquidityAmountsNotAcceptableException(
                ensureQuoteTokenResponse.ratio, 
                "Liquidity amounts are not acceptable"
            )
        }
        // open the position
        const { 
            extInfo: {
                address: {
                    positionNftAccount
                }
            },
            transaction: openPositionVersionedTransaction
        } = await this.raydiumClmmSdk.clmm.openPositionFromLiquidity(
            {
                poolInfo,
                poolKeys,
                tickUpper: Decimal.max(
                    tickLower.toNumber(), 
                    tickUpper.toNumber()
                ).toNumber(),
                tickLower: Decimal.min(
                    tickLower.toNumber(), 
                    tickUpper.toNumber()
                ).toNumber(),
                amountMaxA: res.amountA.amount,
                amountMaxB: res.amountB.amount,
                liquidity: res.liquidity,
                ownerInfo: {
                    useSOLBalance: true,
                },
                txVersion: TxVersion.V0,
                nft2022: true,
                feePayer: new PublicKey(bot.accountAddress),
                computeBudgetConfig: {
                    units: 600000,
                    microLamports: 10000,
                },
            }
        )
        // convert the transaction to a transaction with lifetime
        const openPositionTransaction = fromVersionedTransaction(
            openPositionVersionedTransaction
        ) as TransactionWithLifetime
        // sign the transaction
        const txHash = await this.signerService.withSolanaSigner({
            bot,
            accountAddress: bot.accountAddress,
            network,
            action: async (signer) => {
                const keyPair = await createKeyPairFromBytes(signer.secretKey)
                // set the lifetime constraint
                const signedTransaction = await signTransaction(
                    [keyPair],
                    openPositionTransaction,
                )
                const transactionDigest = await rpc.sendTransaction(
                    getBase64EncodedWireTransaction(signedTransaction),
                    {
                        encoding: "base64",
                        preflightCommitment: "confirmed",
                    }).send()
                const {
                    value: {
                        blockhash,
                        lastValidBlockHeight,
                    }
                } = await rpc.getLatestBlockhash().send()
                await client.confirmTransaction({
                    blockhash,
                    lastValidBlockHeight: Number(lastValidBlockHeight),
                    signature: transactionDigest.toString(),
                })
                return transactionDigest.toString()
            },
        })
        // we refetch the balances after the position is opened
        const {
            quoteBalanceAmount: adjustedQuoteBalanceAmount,
            targetBalanceAmount: adjustedTargetBalanceAmount,
            gasBalanceAmount: adjustedGasBalanceAmount,
        } = await this.balanceService.fetchBalances({
            bot,
        })
        const session = await this.connection.startSession()
        await session.withTransaction(
            async () => {
                await this.openPositionSnapshotService.addOpenPositionTransactionRecord({
                    targetAmountUsed: 
            new BN(snapshotTargetBalanceAmount)
                .sub(new BN(adjustedTargetBalanceAmount)),
                    quoteAmountUsed: 
            new BN(snapshotQuoteBalanceAmount)
                .sub(new BN(adjustedQuoteBalanceAmount)),
                    liquidity: new BN(res.liquidity),
                    gasAmountUsed: snapshotGasBalanceAmount ? 
                        new BN(snapshotGasBalanceAmount)
                            .sub(adjustedGasBalanceAmount ? 
                                new BN(adjustedGasBalanceAmount   
                                ) : new BN(0))
                        : undefined,
                    bot,
                    targetIsA,
                    tickLower: tickLower.toNumber(),
                    tickUpper: tickUpper.toNumber(),
                    network,
                    chainId: bot.chainId,
                    liquidityPoolId: state.static.displayId,
                    positionId: positionNftAccount.toString(),
                    openTxHash: txHash,
                    session,
                })
                await this.balanceSnapshotService.updateBotSnapshotBalancesRecord({
                    bot,
                    targetBalanceAmount: adjustedTargetBalanceAmount,
                    quoteBalanceAmount: adjustedQuoteBalanceAmount,
                    gasAmount: adjustedGasBalanceAmount,
                    session,
                })
            })
    }
}

