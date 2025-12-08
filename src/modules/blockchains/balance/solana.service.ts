import { Injectable } from "@nestjs/common"
import { TokenType } from "@typedefs"
import {
    FetchBalanceParams,
    FetchBalanceResponse,
    IBalanceService,
    ProcessSwapTransactionParams,
    ProcessSwapTransactionResponse,
} from "./balance.interface"
import { 
    LoadBalancerName,
    PrimaryMemoryStorageService, 
} from "@modules/databases"
import {
    TokenNotFoundException,
    TransactionMessageTooLargeException
} from "@exceptions"
import BN from "bn.js"
import {
    address,
    getCompiledTransactionMessageDecoder,
    getTransactionDecoder,
    getBase64Encoder,
    decompileTransactionMessageFetchingLookupTables,
    setTransactionMessageLifetimeUsingBlockhash,
    appendTransactionMessageInstructions,
    isTransactionMessageWithinSizeLimit,
    compileTransaction,
    signTransaction,
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
    SolanaRpcSubscriptionsApi,
} from "@solana/kit"
import { 
    findAssociatedTokenPda, 
    TOKEN_PROGRAM_ADDRESS, 
} from "@solana-program/token"
import {
    fetchToken as fetchToken2022,
    TOKEN_2022_PROGRAM_ADDRESS,
} from "@solana-program/token-2022"
import { fetchToken } from "@solana-program/token"
import { SolanaAggregatorSelectorService } from "../aggregators"
import { EnsureMathService } from "../math"
import { SignerService } from "../signers"
import { BotSchema, TokenSchema } from "@modules/databases"
import Decimal from "decimal.js"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as winstonLogger } from "winston"
import { ClientType, RpcPickerService } from "../clients"

@Injectable()
export class SolanaBalanceService implements IBalanceService {
    constructor(
        private readonly rpcPickerService: RpcPickerService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly solanaAggregatorSelectorService: SolanaAggregatorSelectorService,
        private readonly ensureMathService: EnsureMathService,
        private readonly signerService: SignerService,
        @InjectWinston()
        private readonly logger: winstonLogger,
    ) { }

    public async fetchBalance(
        {
            bot,
            tokenId,
        }: FetchBalanceParams
    ): Promise<FetchBalanceResponse> {
        const token = this.primaryMemoryStorageService.tokens.find(
            (token) => token.displayId === tokenId.toString()
        )
        if (!token) {
            throw new TokenNotFoundException("Token not found")
        }
        return await this.rpcPickerService.withSolanaRpc({
            clientType: ClientType.Read,
            mainLoadBalancerName: LoadBalancerName.SolanaBalance,
            callback: async ({ rpc }) => {
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
            },
        })
        
    }

    public async processSwapTransaction(
        {
            bot,
            tokenIn,
            tokenOut,
            amountIn,
            estimatedSwappedAmount,
        }: ProcessSwapTransactionParams
    ): Promise<ProcessSwapTransactionResponse> {
        const batchQuoteResponse = await this.solanaAggregatorSelectorService.batchQuote({
            tokenIn: tokenIn.displayId,
            tokenOut: tokenOut.displayId,
            amountIn: amountIn,
            senderAddress: bot.accountAddress,
        })
        this.ensureMathService.ensureActualNotAboveExpected({
            expected: estimatedSwappedAmount,
            actual: batchQuoteResponse.response.amountOut,
            lowerBound: new Decimal(0.95),
        })
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
        const loadBalancerName = this.solanaAggregatorSelectorService.aggregatorIdToLoadBalancerName(batchQuoteResponse.aggregatorId)
        return await this.rpcPickerService.withSolanaRpc({
            clientType: ClientType.Write,
            mainLoadBalancerName: loadBalancerName,
            callback: async ({ rpc, rpcSubscriptions }) => {
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
                    action: async (signer) => {
                        const transactionMessage = pipe(
                            createTransactionMessage({ version: 0 }),
                            (tx) => addSignersToTransactionMessage([signer], tx),
                            (tx) => setTransactionMessageFeePayerSigner(signer, tx),
                            (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
                            (tx) => appendTransactionMessageInstructions(swapInstructions, tx),
                        )
                        if (!isTransactionMessageWithinSizeLimit(transactionMessage)) {
                            throw new TransactionMessageTooLargeException("Transaction message is too large")
                        }
                        const transaction = compileTransaction(transactionMessage)
                        // sign the transaction
                        const signedTransaction = await signTransaction(
                            [signer.keyPair],
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
                                maxRetries: BigInt(5),
                            })
                        this.logger.debug(
                            WinstonLog.SwapTransactionSuccess, {
                                txHash: transactionSignature.toString(),
                                bot: bot.id,
                                tokenInId: tokenIn.displayId,
                                tokenOutId: tokenOut.displayId,
                            })
                        return transactionSignature.toString()
                    },
                })
                return {
                    txHash,
                }
            },
        })
    }
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

export interface CreateTransferFeesTransactionParams {
    bot: BotSchema
    rpc: Rpc<SolanaRpcApi>
    rpcSubscriptions: RpcSubscriptions<SolanaRpcSubscriptionsApi>
    feeAmount: BN
}