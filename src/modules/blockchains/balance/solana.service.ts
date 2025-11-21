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
    PrimaryMemoryStorageService, 
    SwapTransactionSchema, 
    TokenId
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
    getBase64EncodedWireTransaction,
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
import { BotSchema, InjectPrimaryMongoose, TokenSchema } from "@modules/databases"
import { Connection as MongooseConnection } from "mongoose"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"
import { AsyncService, DayjsService } from "@modules/mixin"
import { SwapMathService } from "./swap-math.service"
import { GasStatusService } from "./gas-status.service"
import Decimal from "decimal.js"
import { QuoteRatioService } from "./quote-ratio.service"

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
        @InjectPrimaryMongoose()
        private readonly connection: MongooseConnection,
        @InjectWinston()
        private readonly logger: WinstonLogger,
        private readonly asyncService: AsyncService,
        private readonly dayjsService: DayjsService,
        private readonly swapMathService: SwapMathService,
        private readonly gasStatusService: GasStatusService,
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
            await this.updateBotSnapshotBalances({
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
                    await this.updateBotSnapshotBalances({
                        bot,
                        targetBalanceAmount: adjustedTargetBalanceAmount,
                        quoteBalanceAmount: adjustedQuoteBalanceAmount,
                        gasAmount: adjustedGasBalanceAmount,
                    })
                    await this.addSwapTransactionRecord({
                        txHash,
                        tokenInId: targetToken.displayId,
                        tokenOutId: quoteToken.displayId,
                        amountIn: swapTargetToQuoteAmount,
                        bot,
                    })
                }
            )(),
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
                    await this.updateBotSnapshotBalances({
                        bot,
                        targetBalanceAmount: adjustedTargetBalanceAmount,
                        quoteBalanceAmount: adjustedQuoteBalanceAmount,
                        gasAmount: adjustedGasBalanceAmount,
                    })
                    await this.addSwapTransactionRecord({
                        txHash,
                        tokenInId: targetToken.displayId,
                        tokenOutId: quoteToken.displayId,
                        amountIn: swapQuoteToTargetAmount,
                        bot,
                    })
                })()
        ]
        )
    }

    private async processSwapTransaction(
        {
            bot,
            rpc,
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
                const txHash = await rpc.sendTransaction(
                    getBase64EncodedWireTransaction(signedTransaction),
                    {
                        preflightCommitment: "confirmed",
                        encoding: "base64"
                    }).send()
                return txHash
            },
        })
        return txHash
    }

    private async updateBotSnapshotBalances({
        bot,
        targetBalanceAmount,
        quoteBalanceAmount,
        gasAmount,
    }: UpdateBotSnapshotBalancesParams): Promise<void> {
        // snapshot to reduce the onchain reads
        const sameTarget =
            bot.snapshotTargetTokenBalanceAmount &&
            targetBalanceAmount.eq(new BN(bot.snapshotTargetTokenBalanceAmount))
    
        const sameQuote =
            bot.snapshotQuoteTokenBalanceAmount &&
            quoteBalanceAmount.eq(new BN(bot.snapshotQuoteTokenBalanceAmount))
    
        const sameGas =
            bot.snapshotGasTokenBalanceAmount &&
            gasAmount &&
            gasAmount.eq(new BN(bot.snapshotGasTokenBalanceAmount))
    
        // If every snapshot is the same → skip update
        if (sameTarget && sameQuote && sameGas) {
            return
        }
    
        await this.connection.model(BotSchema.name).updateOne(
            { _id: bot.id },
            {
                $set: {
                    snapshotTargetTokenBalanceAmount: targetBalanceAmount.toString(),
                    snapshotQuoteTokenBalanceAmount: quoteBalanceAmount.toString(),
                    snapshotGasTokenBalanceAmount: gasAmount?.toString(),
                    lastBalancesSnapshotAt: this.dayjsService.now().toDate(),
                },
            },
        )
    
        this.logger.info(WinstonLog.BotSnapshotBalancesUpdated, {
            bot: bot.id,
            targetBalanceAmount: targetBalanceAmount.toString(),
            quoteBalanceAmount: quoteBalanceAmount.toString(),
            gasAmount: gasAmount?.toString(),
        })
    }

    private async addSwapTransactionRecord(
        {
            amountIn,
            tokenInId,
            tokenOutId,
            txHash,
            bot,
        }: AddSwapTransactionRecordParams
    ): Promise<void> {
        await this.connection.model<SwapTransactionSchema>(SwapTransactionSchema.name)
            .create({
                tokenInId,
                tokenOutId,
                amountIn,
                chainId: ChainId.Solana,
                network: Network.Mainnet,
                txHash,
                bot: bot.id,
            })
        this.logger.info(
            WinstonLog.SwapTransactionAdded, {
                txHash,
                bot: bot.id,
            })
    }
}

interface ProcessSwapTransactionParams {
    bot: BotSchema
    rpc: Rpc<SolanaRpcApi>
    tokenIn: TokenSchema
    tokenOut: TokenSchema
    batchQuoteResponse: BatchQuoteResponse
}

interface UpdateBotSnapshotBalancesParams {
    bot: BotSchema
    targetBalanceAmount: BN
    quoteBalanceAmount: BN
    gasAmount?: BN
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

interface AddSwapTransactionRecordParams {
    txHash: string
    tokenInId: TokenId
    tokenOutId: TokenId
    amountIn: BN
    bot: BotSchema
}