import {
    Injectable
} from "@nestjs/common"
import {
    PrepareWithdrawTransactionParams,
    PrepareWithdrawTransactionResult,
    SignWithdrawTransactionParams,
    SignWithdrawTransactionResult,
} from "../types"
import {
    ExecuteWithdrawTransactionParams,
    ExecuteWithdrawTransactionResult,
} from "../types"
import {
    TokenId,
    TransactionType,
} from "@modules/databases"
import {
    TokenNotFoundException,
} from "@modules/exceptions"
import {
    getCompiledTransactionMessageDecoder,
    getTransactionDecoder,
    getBase64Encoder,
    decompileTransactionMessageFetchingLookupTables,
    address,
    Instruction,
    createNoopSigner,
} from "@solana/kit"
import {
    SolanaAggregatorSelectorService
} from "../../aggregators"
import {
    SolanaTxService,
    SolanaFetchService,
    SolanaStimulateService,
    SolanaExecuteService,
    RpcExecutorService,
} from "../../clients"
import {
    PrepareTx,
    WithdrawTokenOutput,
} from "../../types"
import {
    RpcAccessType
} from "@modules/filesystem"
import {
    TransferInstructionService,
} from "../../tx-builder"
import {
    PrimaryMemoryStorageService,
} from "@modules/databases"
import {
    InjectSuperJson
} from "@modules/mixin"
import {
    ChainId,
    TokenType,
} from "@modules/common"
import {
    SuperJSON
} from "superjson"
import {
    findAssociatedTokenPda,
    getCreateAssociatedTokenIdempotentInstruction,
    TOKEN_PROGRAM_ADDRESS
} from "@solana-program/token"
import {
    TOKEN_2022_PROGRAM_ADDRESS
} from "@solana-program/token-2022"
import BN from "bn.js"
import _ from "lodash"
import {
    SolanaBalanceFetcherService 
} from "./fetcher.service"
import {
    AsyncService
} from "@modules/mixin"
/**
 * Service for handling withdraw transactions on Solana.
 * Supports withdrawing tokens directly or converting to USDC before withdrawal.
 *
 * @example
 * const service = new SolanaWithdrawActionService(...)
 * const prepareTxs = await service.prepare({ bot, tokenInputs, toAddress })
 * const txHash = await service.execute({ bot, signedTx })
 */
@Injectable()
export class SolanaWithdrawActionService {
    constructor(
        private readonly rpcExecutorService: RpcExecutorService,
        private readonly solanaAggregatorSelectorService: SolanaAggregatorSelectorService,
        private readonly solanaTxService: SolanaTxService,
        @InjectSuperJson()
        private readonly superJson: SuperJSON,
        private readonly transferInstructionService: TransferInstructionService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly solanaFetchService: SolanaFetchService,
        private readonly solanaStimulateService: SolanaStimulateService,
        private readonly solanaExecuteService: SolanaExecuteService,
        private readonly solanaBalanceFetcherService: SolanaBalanceFetcherService,
        private readonly asyncService: AsyncService,
    ) { }

    /**
     * Prepares withdraw transactions.
     * Optionally converts tokens to USDC before withdrawal.
     *
     * @param param - Parameters for preparing withdraw transaction
     * @returns Prepared transactions ready for execution
     *
     * @example
     * const prepareTx = await service.prepare({ bot, tokenInputs, toAddress, toUsdc: true })
     */
    public async prepare(
        {
            bot,
            tokenInputs,
            toAddress,
            toUsdc = false
        }: PrepareWithdrawTransactionParams):
        Promise<PrepareWithdrawTransactionResult> {
        const prepareTxs: Array<PrepareTx> = []
        const instructions: Array<Instruction> = []
        let tokenOutputs: Array<WithdrawTokenOutput> = []
        for (const tokenInput of tokenInputs) {
            if (toUsdc) {
                // find USDC token
                const usdcToken = Array.from(this.primaryMemoryStorageService.tokenMap.values()).find(
                    (t) => t.displayId === TokenId.SolUsdc,
                )
                if (!usdcToken) {
                    throw new TokenNotFoundException({
                        displayId: TokenId.SolUsdc,
                    })
                }
                // swap to USDC if token is not already USDC
                if (tokenInput.token.displayId !== TokenId.SolUsdc) {
                    const swapInstructions: Array<Instruction> = []
                    const [ata] = await findAssociatedTokenPda({
                        mint: address(usdcToken.tokenAddress),
                        owner: address(toAddress),
                        tokenProgram: usdcToken.is2022Token ? TOKEN_2022_PROGRAM_ADDRESS : TOKEN_PROGRAM_ADDRESS,
                    })
                    // create idempotent token account for recipient address
                    const createAssociatedTokenIdempotentInstruction = getCreateAssociatedTokenIdempotentInstruction({
                        mint: address(usdcToken.tokenAddress),
                        owner: address(toAddress),
                        payer: createNoopSigner(address(bot.accountAddress)),
                        ata,
                        tokenProgram: usdcToken.is2022Token ? TOKEN_2022_PROGRAM_ADDRESS : TOKEN_PROGRAM_ADDRESS,
                    })
                    swapInstructions.push(createAssociatedTokenIdempotentInstruction)
                    const { response, aggregatorId } = await this.solanaAggregatorSelectorService.batchQuote({
                        tokenIn: tokenInput.token,
                        tokenOut: usdcToken,
                        amountIn: tokenInput.amount,
                        senderAddress: bot.accountAddress,
                    })
                    const { payload: serializedTransaction } = await this.solanaAggregatorSelectorService.selectorSwap({
                        aggregatorId,
                        base: {
                            payload: response.payload,
                            tokenIn: tokenInput.token,
                            tokenOut: usdcToken,
                            accountAddress: bot.accountAddress,
                            recipientAddress: ata,
                        },
                    })
                    // decode and decompile swap transaction
                    const swapTransactionBytes = getBase64Encoder().encode(serializedTransaction as string)
                    const swapTransaction = getTransactionDecoder().decode(swapTransactionBytes)
                    const compiledSwapTransactionMessage = getCompiledTransactionMessageDecoder().decode(
                        swapTransaction.messageBytes,
                    )
                    const swapTransactionMessage = await this.rpcExecutorService.withSolanaRpc({
                        accessType: RpcAccessType.Http,
                        callback: async ({ rpc }) => {
                            return await decompileTransactionMessageFetchingLookupTables(
                                compiledSwapTransactionMessage,
                                rpc
                            )
                        },
                    })
                    // add swap instructions
                    swapInstructions.push(...swapTransactionMessage.instructions)
                    prepareTxs.push({
                        chainId: ChainId.Solana,
                        serializedTx: this.superJson.stringify(swapInstructions),
                    })
                    tokenOutputs.push({
                        tokenId: usdcToken.id.toString(),
                        amount: response.amountOut
                    })
                } else {
                    // create transfer instructions
                    const { instructions: transferInstructions } = await this.transferInstructionService.createTransferInstructions({
                        fromAddress: address(bot.accountAddress),
                        toAddress: address(toAddress),
                        amount: tokenInput.amount,
                        token: usdcToken,
                    })
                    instructions.push(...transferInstructions)
                    tokenOutputs.push({
                        tokenId: usdcToken.id.toString(),
                        amount: tokenInput.amount
                    })
                }
            } else {
                // find target token for conversion
                const targetToken = this.primaryMemoryStorageService.tokenMap.get(bot.targetToken.toString())
                if (!targetToken) {
                    throw new TokenNotFoundException({
                        displayId: tokenInput.token.displayId,
                    })
                }
                // swap to target token if needed
                if (tokenInput.token.displayId !== targetToken.displayId) {
                    const swapInstructions: Array<Instruction> = []
                    let destinationAddress = toAddress
                    if (targetToken.type !== TokenType.Native) {
                        // create associated token account for recipient address
                        const [ata] = await findAssociatedTokenPda({
                            mint: address(targetToken.tokenAddress),
                            owner: address(toAddress),
                            tokenProgram: targetToken.is2022Token ? TOKEN_2022_PROGRAM_ADDRESS : TOKEN_PROGRAM_ADDRESS,
                        })
                        const createAssociatedTokenIdempotentInstruction = getCreateAssociatedTokenIdempotentInstruction({
                            mint: address(targetToken.tokenAddress),
                            owner: address(toAddress),
                            payer: createNoopSigner(address(bot.accountAddress)),
                            ata,
                            tokenProgram: targetToken.is2022Token ? TOKEN_2022_PROGRAM_ADDRESS : TOKEN_PROGRAM_ADDRESS,
                        })
                        swapInstructions.push(createAssociatedTokenIdempotentInstruction)
                        destinationAddress = ata
                    }
                    const { response, aggregatorId } = await this.solanaAggregatorSelectorService.batchQuote({
                        tokenIn: tokenInput.token,
                        tokenOut: targetToken,
                        amountIn: tokenInput.amount,
                        senderAddress: bot.accountAddress,
                    })
                    const { payload: serializedTransaction } = await this.solanaAggregatorSelectorService.selectorSwap({
                        aggregatorId,
                        base: {
                            payload: response.payload,
                            tokenIn: tokenInput.token,
                            tokenOut: targetToken,
                            accountAddress: bot.accountAddress,
                            recipientAddress: destinationAddress,
                        },
                    })
                    // decode and decompile swap transaction
                    const swapTransactionBytes = getBase64Encoder().encode(serializedTransaction as string)
                    const swapTransaction = getTransactionDecoder().decode(swapTransactionBytes)
                    const compiledSwapTransactionMessage = getCompiledTransactionMessageDecoder().decode(
                        swapTransaction.messageBytes,
                    )
                    const swapTransactionMessage = await this.rpcExecutorService.withSolanaRpc({
                        accessType: RpcAccessType.Http,
                        callback: async ({ rpc }) => {
                            return await decompileTransactionMessageFetchingLookupTables(
                                compiledSwapTransactionMessage,
                                rpc
                            )
                        },
                    })
                    // add swap instructions
                    swapInstructions.push(...swapTransactionMessage.instructions)
                    prepareTxs.push({
                        chainId: ChainId.Solana,
                        serializedTx: this.superJson.stringify(swapInstructions),
                    })
                    tokenOutputs.push({
                        tokenId: targetToken.id.toString(),
                        amount: response.amountOut
                    })
                } else {
                    // create transfer instructions
                    const { instructions: transferInstructions } = await this.transferInstructionService.createTransferInstructions(
                        {
                            fromAddress: address(bot.accountAddress),
                            toAddress: address(toAddress),
                            amount: tokenInput.amount,
                            token: tokenInput.token,
                        }
                    )
                    instructions.push(...transferInstructions)
                }
            }
        }
        prepareTxs.push(
            {
                chainId: ChainId.Solana,
                serializedTx: this.superJson.stringify(instructions),
            }
        )
        tokenOutputs = Object.entries(
            _.groupBy(tokenOutputs,
                "tokenId")
        ).map(
            ([tokenId,
                outputs]) => ({
                tokenId,
                amount: outputs.reduce(
                    (sum, output) => sum.add(output.amount),
                    new BN(0)
                ),
            })
        )
        const tokenOutputSnapshots = await this.asyncService.allMustDone(
            tokenOutputs.map(async (tokenOutput) => {
                const token = this.primaryMemoryStorageService.tokenMap.get(tokenOutput.tokenId)
                if (!token) {
                    throw new TokenNotFoundException({
                        id: tokenOutput.tokenId,
                    })
                }
                const balance = await this.solanaBalanceFetcherService.fetchBalance({
                    bot,
                    token,
                })
                return {
                    tokenId: tokenOutput.tokenId,
                    amount: balance.balanceAmount,
                }
            })
        )
        return {
            prepareTxs,
            tokenOutputs,
            tokenOutputSnapshots,
        }
    }

    /**
     * Signs a withdraw transaction.
     * Validates state, builds transaction, and signs it.
     *
     * @param param - Parameters for signing withdraw transaction
     * @param param.bot - Bot schema
     * @param param.prepareTx - Prepared transaction
     * @returns Signed transaction
     */
    async sign({
        bot,
        prepareTx,
    }: SignWithdrawTransactionParams)
    : Promise < SignWithdrawTransactionResult > {
        return {
            signedTx: await this.solanaTxService.signTx(
                {
                    bot,
                    prepareTx,
                    transactionType: TransactionType.Withdraw,
                }
            ),
        }
    }

    /**
     * Executes withdraw transactions.
     *
     * @param param - Parameters for executing withdraw transaction
     * @returns Array of transaction hashes
     *
     * @example
     * const txHash = await service.execute({ bot, signedTx })
     */
    public async execute({
        bot,
        signedTx,
        txCheck = false,
        stimulate = false
    }: ExecuteWithdrawTransactionParams): Promise<ExecuteWithdrawTransactionResult> {
        if (txCheck && !stimulate) {
            const transaction = await this.solanaFetchService.fetchTransaction({
                txHash: signedTx.txHash,
            })
            if (transaction) {
                return {
                    txHash: signedTx.txHash,
                }
            }
        }
        if (stimulate) {
            const { txHash } = await this.solanaStimulateService.stimulate({
                signedTx,
                bot,
                transactionType: TransactionType.Withdraw,
            })
            return {
                txHash,
            }
        }
        const { txHash } = await this.solanaExecuteService.execute({
            signedTx,
            bot,
            transactionType: TransactionType.Withdraw,
        })
        return {
            txHash,
        }
    }
}