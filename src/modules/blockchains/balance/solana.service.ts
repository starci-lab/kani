import { Injectable } from "@nestjs/common"
import { HttpAndWsClients, InjectSolanaClients } from "../clients"
import { ChainId, Network, TokenType } from "@modules/common"
import { Connection } from "@solana/web3.js"
import {
    ExecuteBalanceRebalancingParams,
    FetchBalanceParams,
    FetchBalanceResponse,
    FetchBalancesParams,
    FetchBalancesResponse,
    GasStatus,
    IBalanceService,
} from "./balance.interface"
import { 
    InjectPrimaryMongoose,
    PrimaryMemoryStorageService, 
} from "@modules/databases"
import {
    EstimatedSwappedQuoteAmountNotFoundException,
    TargetOperationalGasAmountNotFoundException,
    TokenNotFoundException,
    TransactionMessageTooLargeException
} from "@exceptions"
import BN from "bn.js"
import {
    address,
    createSolanaRpc,
    getCompiledTransactionMessageDecoder,
    getTransactionDecoder,
    getBase64Encoder,
    createKeyPairFromBytes,
    decompileTransactionMessageFetchingLookupTables,
    setTransactionMessageLifetimeUsingBlockhash,
    appendTransactionMessageInstructions,
    isTransactionMessageWithinSizeLimit,
    compileTransaction,
    signTransaction,
    createSignerFromKeyPair,
    setTransactionMessageFeePayerSigner,
    pipe,
    createTransactionMessage,
    addSignersToTransactionMessage,
    Rpc,
    SolanaRpcApi,
    assertIsSendableTransaction,
    assertIsTransactionWithinSizeLimit,
    sendAndConfirmTransactionFactory,
    RpcSubscriptions,
    getSignatureFromTransaction,
    createSolanaRpcSubscriptions,
    SolanaRpcSubscriptionsApi,
} from "@solana/kit"
import { findAssociatedTokenPda, TOKEN_PROGRAM_ADDRESS } from "@solana-program/token"
import {
    fetchToken as fetchToken2022,
    TOKEN_2022_PROGRAM_ADDRESS
} from "@solana-program/token-2022"
import { fetchToken } from "@solana-program/token"
import { BatchQuoteResponse, SolanaAggregatorSelectorService } from "../aggregators"
import { EnsureMathService } from "../math"
import { SignerService } from "../signers"
import { BotSchema, TokenSchema } from "@modules/databases"
import { AsyncService } from "@modules/mixin"
import { SwapMathService } from "./swap-math.service"
import { GasStatusService } from "./gas-status.service"
import Decimal from "decimal.js"
import { QuoteRatioService } from "./quote-ratio.service"
import { BalanceSnapshotService } from "../snapshots"
import { SwapTransactionSnapshotService } from "../snapshots"
import { Connection as MongooseConnection } from "mongoose"
import { httpsToWss } from "@utils"

@Injectable()
export class SolanaBalanceService implements IBalanceService {
    constructor(
        @InjectSolanaClients()
        private readonly solanaClients: Record<
            Network,
            HttpAndWsClients<Connection>
        >,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly quoteRatioService: QuoteRatioService,
        private readonly solanaAggregatorSelectorService: SolanaAggregatorSelectorService,
        private readonly ensureMathService: EnsureMathService,
        private readonly signerService: SignerService,
        private readonly asyncService: AsyncService,
        private readonly swapMathService: SwapMathService,
        private readonly gasStatusService: GasStatusService,
        private readonly balanceSnapshotService: BalanceSnapshotService,
        private readonly swapTransactionSnapshotService: SwapTransactionSnapshotService,
        @InjectPrimaryMongoose()
        private readonly connection: MongooseConnection,
    ) { }

    public async fetchBalance(
        {
            bot,
            tokenId,
            clientIndex = 0,
        }: FetchBalanceParams
    ): Promise<FetchBalanceResponse> {
        const token = this.primaryMemoryStorageService.tokens.find(
            (token) => token.displayId === tokenId.toString()
        )
        if (!token) {
            throw new TokenNotFoundException("Token not found")
        }
        const client = this.solanaClients[token.network].http[clientIndex]
        const rpc = createSolanaRpc(client.rpcEndpoint)
        // return the native token balance
        if (token.type === TokenType.Native) {
            const balance = await rpc.getBalance(address(bot.accountAddress)).send()
            return {
                balanceAmount: new BN(balance.value.toString()),
            }
        }
        // return the token balance
        const mintAddress = address(token.tokenAddress)
        const ownerAddress = address(bot.accountAddress)
        // Derive the user's associated token account (ATA)
        // This is required because balances are stored in ATA, not in the owner wallet directly.
        const [
            ataAddress
        ] = await findAssociatedTokenPda(
            {
                mint: mintAddress,
                owner: ownerAddress,
                tokenProgram:
                    token.is2022Token
                        ? TOKEN_2022_PROGRAM_ADDRESS
                        : TOKEN_PROGRAM_ADDRESS,
            }
        )

        // Token-2022 accounts are handled by the newer token-2022 program.
        try {
            if (token.is2022Token) {
                const token2022 = await fetchToken2022(rpc, ataAddress)
                return {
                    balanceAmount: new BN(token2022.data.amount.toString()),
                }
            } else {
                // Standard SPL token account
                const tokenAccount = await fetchToken(rpc, ataAddress)
                return {
                    balanceAmount: new BN(tokenAccount.data.amount.toString()),
                }
            }
        } catch {
            // we dont find the ata address, so the balance is 0
            return {
                balanceAmount: new BN(0),
            }
        }
    }

    public async fetchBalances(
        {
            bot,
            clientIndex = 0,
        }: FetchBalancesParams
    ): Promise<FetchBalancesResponse> {
        const network = Network.Mainnet
        const chainId = ChainId.Solana
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
        const { balanceAmount: targetBalanceAmount } = await this.fetchBalance({
            bot,
            tokenId: targetToken.displayId,
            clientIndex,
        })
        const { balanceAmount: quoteBalanceAmount } = await this.fetchBalance({
            bot,
            tokenId: quoteToken.displayId,
            clientIndex,
        })
        const gasStatus = await this.gasStatusService.getGasStatus({
            targetTokenId: targetToken.displayId,
            quoteTokenId: quoteToken.displayId,
        })
        const targetOperationalGasAmount = this.primaryMemoryStorageService.gasConfig
            .gasAmountRequired?.[chainId]?.[network]?.targetOperationalAmount
        if (!targetOperationalGasAmount) {
            throw new TargetOperationalGasAmountNotFoundException(
                chainId,
                network,
                "Target operational gas amount not found"
            )
        }
        const targetOperationalGasAmountBN = new BN(targetOperationalGasAmount)
        switch (gasStatus) {
        case GasStatus.IsTarget: {
            const targetBalanceAmountAfterDeductingGas = targetBalanceAmount.sub(targetOperationalGasAmountBN)
            const quoteRatioResponse = await this.quoteRatioService.computeQuoteRatio({
                targetTokenId: targetToken.displayId,
                quoteTokenId: quoteToken.displayId,
                targetBalanceAmount: targetBalanceAmountAfterDeductingGas,
                quoteBalanceAmount,
            })
            return {
                targetBalanceAmount: targetBalanceAmountAfterDeductingGas,
                quoteBalanceAmount,
                gasStatus,
                gasBalanceAmount: targetOperationalGasAmountBN,
                quoteRatioResponse,
            }
        }
        case GasStatus.IsQuote: {
            const quoteBalanceAmountAfterDeductingGas = quoteBalanceAmount.sub(targetOperationalGasAmountBN)
            const quoteRatioResponse = await this.quoteRatioService.computeQuoteRatio({
                targetTokenId: targetToken.displayId,
                quoteTokenId: quoteToken.displayId,
                targetBalanceAmount,
                quoteBalanceAmount: quoteBalanceAmountAfterDeductingGas,
            })
            return {
                targetBalanceAmount,
                quoteBalanceAmount: quoteBalanceAmountAfterDeductingGas,
                gasStatus,
                gasBalanceAmount: targetOperationalGasAmountBN,
                quoteRatioResponse,
            }
        }
        default: {
            const gasToken = this.primaryMemoryStorageService.tokens.find(
                (token) => 
                    token.type === TokenType.Native 
                    && token.network === network 
                    && token.chainId === chainId
            )
            if (!gasToken) {
                throw new TokenNotFoundException("Gas token not found")
            }
            const { balanceAmount: gasBalanceAmount } = await this.fetchBalance({
                bot,
                tokenId: gasToken.displayId,
                clientIndex,
            })
            const quoteRatioResponse = await this.quoteRatioService.computeQuoteRatio({
                targetTokenId: targetToken.displayId,
                quoteTokenId: quoteToken.displayId,
                targetBalanceAmount,
                quoteBalanceAmount,
            })
            return {
                quoteRatioResponse,
                targetBalanceAmount,
                quoteBalanceAmount,
                gasBalanceAmount,
                gasStatus,
            }
        }
        }
    }

    async executeBalanceRebalancing(
        {
            bot,
            clientIndex = 0,
        }: ExecuteBalanceRebalancingParams
    ): Promise<void> {
        const client = this.solanaClients[Network.Mainnet].http[clientIndex]
        const rpc = createSolanaRpc(client.rpcEndpoint)
        const rpcSubscriptions = createSolanaRpcSubscriptions(httpsToWss(client.rpcEndpoint))
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
        const { 
            targetBalanceAmount, 
            quoteBalanceAmount, 
            gasBalanceAmount, 
            quoteRatioResponse,
        } = await this.fetchBalances({
            bot,
            clientIndex,
        })
        const { 
            processSwaps,
            swapTargetToQuoteAmount, 
            swapQuoteToTargetAmount, 
            estimatedSwappedTargetAmount,
            estimatedSwappedQuoteAmount,
        } = await this.swapMathService.computeSwapAmount({
            targetTokenId: targetToken.displayId,
            quoteTokenId: quoteToken.displayId,
            targetBalanceAmount,
            quoteBalanceAmount,
            gasBalanceAmount,
            quoteRatioResponse,
        })
        if (!processSwaps) {
            // just snapshot the balances and return
            // ensure the balances are synced
            await this.balanceSnapshotService.updateBotSnapshotBalancesRecord({
                bot,
                targetBalanceAmount,
                quoteBalanceAmount,
                gasAmount: gasBalanceAmount,
            })
            return
        }
        await this.asyncService.allMustDone([
            (
                async () => {
                    if (!swapTargetToQuoteAmount) {
                        return
                    }
                }
            )(),
            (
                async () => {
                    if (!swapTargetToQuoteAmount) {
                        return
                    }
                    const batchQuoteResponse = await this.solanaAggregatorSelectorService.batchQuote({
                        tokenIn: targetToken.displayId,
                        tokenOut: quoteToken.displayId,
                        amountIn: swapTargetToQuoteAmount,
                        senderAddress: bot.accountAddress,
                    })
                    if (!estimatedSwappedQuoteAmount) {
                        throw new EstimatedSwappedQuoteAmountNotFoundException(
                            "Estimated swapped quote amount not found"
                        )
                    }
                    this.ensureMathService.ensureActualNotAboveExpected({
                        expected: estimatedSwappedQuoteAmount,
                        actual: batchQuoteResponse.response.amountOut,
                        lowerBound: new Decimal(0.95),
                    })
                    const txHash = await this.processSwapTransaction({
                        bot,
                        rpc,
                        rpcSubscriptions,
                        batchQuoteResponse: batchQuoteResponse,
                        tokenIn: targetToken,
                        tokenOut: quoteToken,
                    })
                    const {
                        targetBalanceAmount: adjustedTargetBalanceAmount,
                        quoteBalanceAmount: adjustedQuoteBalanceAmount,
                        gasBalanceAmount: adjustedGasBalanceAmount,
                    } = await this.fetchBalances({
                        bot,
                        clientIndex,
                    })
                    const session = await this.connection.startSession()
                    await session.withTransaction(
                        async () => {
                            await this.balanceSnapshotService.updateBotSnapshotBalancesRecord({
                                bot,
                                targetBalanceAmount: adjustedTargetBalanceAmount,
                                quoteBalanceAmount: adjustedQuoteBalanceAmount,
                                gasAmount: adjustedGasBalanceAmount,
                                session,
                            })
                            await this.swapTransactionSnapshotService.addSwapTransactionRecord({
                                txHash,
                                tokenInId: targetToken.displayId,
                                tokenOutId: quoteToken.displayId,
                                amountIn: swapTargetToQuoteAmount,
                                bot,
                                session,
                            })
                        })
                })(),
            (
                async () => {
                    if (!swapQuoteToTargetAmount) {
                        return
                    }
                    const batchQuoteResponse = await this.solanaAggregatorSelectorService.batchQuote({
                        tokenIn: quoteToken.displayId,
                        tokenOut: targetToken.displayId,
                        amountIn: swapQuoteToTargetAmount,
                        senderAddress: bot.accountAddress,
                    })
                    if (!estimatedSwappedTargetAmount) {
                        throw new EstimatedSwappedQuoteAmountNotFoundException(
                            "Estimated swapped target amount not found"
                        )
                    }
                    this.ensureMathService.ensureActualNotAboveExpected({
                        expected: estimatedSwappedTargetAmount,
                        actual: batchQuoteResponse.response.amountOut,
                        lowerBound: new Decimal(0.95),
                    })
                    const txHash = await this.processSwapTransaction({
                        bot,
                        rpc,
                        rpcSubscriptions,
                        batchQuoteResponse: batchQuoteResponse,
                        tokenIn: targetToken,
                        tokenOut: quoteToken,
                    })
                    const {
                        targetBalanceAmount: adjustedTargetBalanceAmount,
                        quoteBalanceAmount: adjustedQuoteBalanceAmount,
                        gasBalanceAmount: adjustedGasBalanceAmount,
                    } = await this.fetchBalances({
                        bot,
                        clientIndex,
                    })
                    const session = await this.connection.startSession()
                    await session.withTransaction(
                        async () => {
                            await this.balanceSnapshotService.updateBotSnapshotBalancesRecord({
                                bot,
                                targetBalanceAmount: adjustedTargetBalanceAmount,
                                quoteBalanceAmount: adjustedQuoteBalanceAmount,
                                gasAmount: adjustedGasBalanceAmount,
                                session,
                            })
                            await this.swapTransactionSnapshotService.addSwapTransactionRecord({
                                txHash,
                                tokenInId: targetToken.displayId,
                                tokenOutId: quoteToken.displayId,
                                amountIn: swapQuoteToTargetAmount,
                                bot,
                                session,
                            })
                        })})()
        ]
        )
    }

    private async processSwapTransaction(
        {
            bot,
            rpc,
            rpcSubscriptions,
            batchQuoteResponse,
            tokenIn,
            tokenOut,
        }: ProcessSwapTransactionParams
    ): Promise<string> {
        // we fetch the serialized transaction from the aggregator
        const { payload: serializedTransaction } = await this.solanaAggregatorSelectorService.selectorSwap({
            base: {
                payload: batchQuoteResponse.response.payload,
                tokenIn: tokenIn.displayId,
                tokenOut: tokenOut.displayId,
                accountAddress: bot.accountAddress,
            },
            aggregatorId: batchQuoteResponse.aggregatorId,
        })
        // we decode the serialized transaction
        const swapTransactionBytes = getBase64Encoder().encode(serializedTransaction as string)
        const swapTransaction = getTransactionDecoder().decode(swapTransactionBytes)
        const compiledSwapTransactionMessage = getCompiledTransactionMessageDecoder().decode(
            swapTransaction.messageBytes,
        )
        // we decompile the transaction message
        const swapTransactionMessage = await decompileTransactionMessageFetchingLookupTables(
            compiledSwapTransactionMessage,
            rpc
        )
        // we get the swap instructions
        const swapInstructions = swapTransactionMessage.instructions
        // we get the latest blockhash
        const { value: latestBlockhash } = await rpc.getLatestBlockhash().send()
        // we sign the transaction
        const txHash = await this.signerService.withSolanaSigner({
            bot,
            accountAddress: bot.accountAddress,
            action: async (signer) => {
                const keyPair = await createKeyPairFromBytes(signer.secretKey)
                const kitSigner = await createSignerFromKeyPair(keyPair)
                const transactionMessage = pipe(
                    createTransactionMessage({ version: 0 }),
                    (tx) => addSignersToTransactionMessage([kitSigner], tx),
                    (tx) => setTransactionMessageFeePayerSigner(kitSigner, tx),
                    (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
                    (tx) => appendTransactionMessageInstructions(swapInstructions, tx),
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
                const sendAndConfirmTransaction = sendAndConfirmTransactionFactory({
                    rpc,
                    rpcSubscriptions,
                })
                const transactionSignature = getSignatureFromTransaction(signedTransaction)
                await sendAndConfirmTransaction(
                    signedTransaction, {
                        commitment: "confirmed",
                    })
                return transactionSignature.toString()
            },
        })
        return txHash
    }
}

interface ProcessSwapTransactionParams {
    bot: BotSchema
    rpc: Rpc<SolanaRpcApi>
    rpcSubscriptions: RpcSubscriptions<SolanaRpcSubscriptionsApi>
    tokenIn: TokenSchema
    tokenOut: TokenSchema
    batchQuoteResponse: BatchQuoteResponse
}

export interface ComputeTargetToQuoteSwapParams {
    targetToken: TokenSchema
    quoteToken: TokenSchema
    targetBalanceAmount: BN
    quoteBalanceAmount: BN
}

export interface ComputeTargetToQuoteSwapResponse {
    inputAmount: BN
    estimatedOutputAmount: BN
    requiredSwap: boolean
}