import { Injectable } from "@nestjs/common"
import { HttpAndWsClients, InjectSolanaClients } from "../clients"
import { ChainId, computeDenomination, computeRaw, Network, TokenType, toScaledBN, toUnit } from "@modules/common"
import { Connection } from "@solana/web3.js"
import { 
    EvaluateBotBalancesParams, 
    EvaluateBotBalancesResponse, 
    EvaluateBotBalancesStatus, 
    FetchBalanceParams, 
    FetchBalanceResponse, 
    GasStatus,
    IBalanceService
} from "./balance.interface"
import { PrimaryMemoryStorageService, SwapTransactionSchema } from "@modules/databases"
import { 
    MinGasRequiredNotFoundException, 
    MinRequiredAmountNotFoundException, 
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
    getBase64EncodedWireTransaction
} from "@solana/kit"
import { findAssociatedTokenPda, TOKEN_PROGRAM_ADDRESS } from "@solana-program/token"
import { 
    fetchToken as fetchToken2022, 
    TOKEN_2022_PROGRAM_ADDRESS 
} from "@solana-program/token-2022"
import { fetchToken } from "@solana-program/token"
import { OraclePriceService } from "../pyth"
import { Decimal } from "decimal.js"
import { SAFE_QUOTE_RATIO_IDEAL, SAFE_QUOTE_RATIO_MAX, SAFE_QUOTE_RATIO_MIN } from "./constants"
import { BatchQuoteResponse, SolanaAggregatorSelectorService } from "../aggregators"
import { EnsureMathService } from "../math"
import { SwapExpectedAndQuotedAmountsNotAcceptableException } from "@exceptions"
import { SignerService } from "../signers"
import { BotSchema, InjectPrimaryMongoose, TokenSchema } from "@modules/databases"
import { Connection as MongooseConnection } from "mongoose"
@Injectable()
export class SolanaBalanceService implements IBalanceService {
    constructor(
        @InjectSolanaClients()
        private readonly solanaClients: Record<
        Network, 
        HttpAndWsClients<Connection>
    >,
    private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    private readonly oraclePriceService: OraclePriceService,
    private readonly solanaAggregatorSelectorService: SolanaAggregatorSelectorService,
    private readonly ensureMathService: EnsureMathService,
    private readonly signerService: SignerService,
    @InjectPrimaryMongoose()
    private readonly connection: MongooseConnection,
    ) { }

    private async fetchBalance(
        {
            accountAddress,
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
            const balance = await rpc.getBalance(address(accountAddress)).send()
            return {
                balanceAmount: new BN(balance.value.toString()),
            }
        }
        // return the token balance
        const mintAddress = address(token.tokenAddress)
        const ownerAddress = address(accountAddress)
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

    async evaluateBotBalances(
        {
            bot,
        }: EvaluateBotBalancesParams
    ): Promise<EvaluateBotBalancesResponse> {
        const network = Network.Mainnet
        const client = this.solanaClients[network].http[0]
        const rpc = createSolanaRpc(client.rpcEndpoint)
        const gasAmount = this.primaryMemoryStorageService.gasConfig.minGasRequired?.[ChainId.Solana]?.[network]
        if (!gasAmount) {
            throw new MinGasRequiredNotFoundException(
                ChainId.Solana, 
                network, 
                "Min gas required not found"
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
        let gasStatus: GasStatus = GasStatus.IsGas
        if (targetToken.type === TokenType.Native) {
            gasStatus = GasStatus.IsTarget
        } else if (quoteToken.type === TokenType.Native) {
            gasStatus = GasStatus.IsQuote
        }
        // if the target token is the gas token, we easily check the balance
        if (gasStatus === GasStatus.IsTarget) {
            const { balanceAmount: targetBalanceAmount } 
            = await this.fetchBalance({
                accountAddress: bot.accountAddress,
                tokenId: targetToken.displayId,
            })
            if (!targetToken.minRequiredAmount) {
                throw new MinRequiredAmountNotFoundException(
                    targetToken.displayId, 
                    "Min required amount not found"
                )
            }
            // we compare the target balance with the min required amount + the gas amount
            // if less than, we return insufficient target balance
            // which will terminate the bot
            const gasAmountBN = new BN(
                computeRaw(new Decimal(gasAmount), 
                    targetToken.decimals
                ))
            const minRequiredAmountBN = new BN(
                computeRaw(
                    new Decimal(targetToken.minRequiredAmount), 
                    targetToken.decimals
                ))
            if (targetBalanceAmount
                .lt(
                    minRequiredAmountBN.add(gasAmountBN)
                )) {
                return {
                    status: EvaluateBotBalancesStatus.InsufficientTargetBalance,
                    isTerminate: true,
                }
            }
            // else, we return ok
            const availableTargetBalanceAmount = targetBalanceAmount.sub(gasAmountBN)
            // // we fetch the quote balance, to determine the swap amount if there is too little quote balance or too much
            const { balanceAmount: quoteBalanceAmount } = await this.fetchBalance({
                accountAddress: bot.accountAddress,
                tokenId: quoteToken.displayId,
            })
            // we get the oracle price of the target token and the quote token
            const oraclePrice = await this.oraclePriceService.getOraclePrice({
                tokenA: targetToken.displayId,
                tokenB: quoteToken.displayId,
            })
            // we compute the target token in quote token
            const targetBalanceAmountInQuote = computeDenomination(
                availableTargetBalanceAmount, 
                targetToken.decimals
            ).mul(oraclePrice)
            const quoteBalanceAmountInQuote = computeDenomination(
                quoteBalanceAmount, 
                quoteToken.decimals
            )
            const totalBalanceAmountInQuote = targetBalanceAmountInQuote.add(quoteBalanceAmountInQuote)
            const quoteRatio = quoteBalanceAmountInQuote.div(totalBalanceAmountInQuote)
            // // if the ratio is less than the safe quote ratio min, we return insufficient quote balance
            if (quoteRatio.lt(SAFE_QUOTE_RATIO_MIN)) 
            {
                const idealQuoteBalanceInQuote = totalBalanceAmountInQuote.mul(SAFE_QUOTE_RATIO_IDEAL)
                const quoteShortfallInQuote = idealQuoteBalanceInQuote.sub(quoteBalanceAmountInQuote)
                const quoteShortfallInQuoteBN = new BN(
                    computeRaw(
                        new Decimal(quoteShortfallInQuote), 
                        quoteToken.decimals
                    )
                )
                const targetBalanceAmountSwapToQuote = toScaledBN(
                    toUnit(targetToken.decimals), 
                    new Decimal(1).div(new Decimal(oraclePrice)
                    ))
                    .mul(quoteShortfallInQuoteBN).div(toUnit(quoteToken.decimals))
                // we return ok, but we need to swap a partial of the target balance amount to the quote balance amount
                // to ensure the quote balance still remain in the safe ratio
                const batchQuoteResponse = await this.solanaAggregatorSelectorService.batchQuote({
                    tokenIn: targetToken.displayId,
                    tokenOut: quoteToken.displayId,
                    amountIn: targetBalanceAmountSwapToQuote,
                    senderAddress: bot.accountAddress,
                })
                // we ensure the swap amount is acceptable
                const ensureSwapAmountResponse = this.ensureMathService.ensureAmounts({
                    actual: batchQuoteResponse.response.amountOut,
                    expected: quoteShortfallInQuoteBN,
                })
                if (!ensureSwapAmountResponse.isAcceptable) {
                    throw new SwapExpectedAndQuotedAmountsNotAcceptableException(
                        ensureSwapAmountResponse.deviation, 
                        "Swap expected and quoted amounts are not acceptable"
                    )
                }
                const txHash = await this.processSwapTransaction({
                    bot,
                    rpc,
                    batchQuoteResponse,
                    tokenIn: targetToken,
                    tokenOut: quoteToken,
                })
                // we refetch the balance 
                const { 
                    balanceAmount: postTargetBalanceAmount 
                } = await this.fetchBalance(
                    {
                        accountAddress: bot.accountAddress,
                        tokenId: targetToken.displayId,
                    }
                )
                const { 
                    balanceAmount: postSwapQuoteBalanceAmount
                } = await this.fetchBalance(
                    {
                        accountAddress: bot.accountAddress,
                        tokenId: quoteToken.displayId,
                    }
                )
                await this.connection.model<SwapTransactionSchema>(SwapTransactionSchema.name).create({
                    bot: bot.id,
                    tokenIn: targetToken.id,
                    tokenOut: quoteToken.id,
                    amountIn: targetBalanceAmountSwapToQuote,
                    chainId: ChainId.Solana,
                    network,
                    txHash
                })
                await this.connection.model<BotSchema>(BotSchema.name).updateOne(
                    { _id: bot.id },
                    { $set: { 
                        snapshotTargetTokenBalanceAmount: postTargetBalanceAmount.sub(gasAmountBN).toString(), 
                        snapshotQuoteTokenBalanceAmount: postSwapQuoteBalanceAmount.toString(),
                        snapshotGasTokenBalanceAmount: gasAmountBN.toString(),
                    } }
                )
            } else if (
                quoteRatio.gt(SAFE_QUOTE_RATIO_MAX))
            {
                // we return ok, but we need to swap a partial of the quote balance amount to the target balance amount
            }
        }
        return {
            isTerminate: true,
            status: EvaluateBotBalancesStatus.OK,
        }
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
                return txHash.toString() 
            },
        })
        return txHash.toString()
    }
}

interface ProcessSwapTransactionParams {
    bot: BotSchema
    rpc: Rpc<SolanaRpcApi>
    tokenIn: TokenSchema
    tokenOut: TokenSchema
    batchQuoteResponse: BatchQuoteResponse
}