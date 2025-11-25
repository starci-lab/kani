import { Injectable } from "@nestjs/common"
import { ClosePositionParams, DlmmLiquidityPoolState, IActionService, OpenPositionParams } from "../../interfaces"
import { OpenPositionInstructionService } from "./transactions"
import BN from "bn.js"
import { SnapshotBalancesNotSetException, TransactionMessageTooLargeException } from "@exceptions"
import { Network } from "@typedefs"
import { SignerService } from "../../signers"
import { addSignersToTransactionMessage, appendTransactionMessageInstructions, compileTransaction, createKeyPairFromBytes, createSignerFromKeyPair, createSolanaRpc, createSolanaRpcSubscriptions, createisTransactionMessageWithinSizeLimit, TransactionMessage, pipe, setTransactionMessageFeePayerSigner, setTransactionMessageLifetimeUsingBlockhash, signTransaction, createTransactionMessage, isTransactionMessageWithinSizeLimit, sendAndConfirmTransactionFactory, assertIsSendableTransaction, assertIsTransactionWithinSizeLimit, getSignatureFromTransaction, getBase64EncodedWireTransaction } from "@solana/kit"
import { METEORA_CLIENTS_INDEX } from "./constants"
import { InjectSolanaClients } from "../../clients"
import { HttpAndWsClients } from "../../clients"
import { Connection } from "@solana/web3.js"
import { httpsToWss } from "@utils"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"

@Injectable()
export class MeteoraActionService implements IActionService {
    constructor(
        @InjectSolanaClients()
        private readonly solanaClients: Record<Network, HttpAndWsClients<Connection>>,
        private readonly openPositionInstructionService: OpenPositionInstructionService,
        private readonly signerService: SignerService,
        @InjectWinston()
        private readonly logger: WinstonLogger,
    ) {}

    async closePosition(params: ClosePositionParams): Promise<void> {
        const {
            bot,
        } = params
        this.logger.warn("Meteora closePosition called but not implemented")
        throw new Error("Meteora closePosition not implemented")
    }

    async openPosition({
        state,
        bot,
    }: OpenPositionParams): Promise<void> {
        const network = Network.Mainnet
        const client = this.solanaClients[network].http[METEORA_CLIENTS_INDEX]
        const rpc = createSolanaRpc(client.rpcEndpoint)
        const rpcSubscriptions = createSolanaRpcSubscriptions(httpsToWss(client.rpcEndpoint))
        const _state = state as DlmmLiquidityPoolState
        const {
            snapshotTargetBalanceAmount,
            snapshotQuoteBalanceAmount,
            snapshotGasBalanceAmount,
        } = bot
        if (!snapshotTargetBalanceAmount || !snapshotQuoteBalanceAmount || !snapshotGasBalanceAmount) {
            throw new SnapshotBalancesNotSetException("Snapshot balances not set")
        }
        const targetIsA = bot.targetToken.toString() === _state.static.tokenA.toString()
        const amountA = targetIsA ? new BN(snapshotTargetBalanceAmount) : new BN(snapshotQuoteBalanceAmount)
        const amountB = targetIsA ? new BN(snapshotQuoteBalanceAmount) : new BN(snapshotTargetBalanceAmount)
        const {
            instructions,
            positionKeyPairs,
        } = await this.openPositionInstructionService.createOpenPositionInstructions({
            bot,
            state: _state,
            amountA,
            amountB,
        })
        await this.signerService.withSolanaSigner({
            bot,
            accountAddress: bot.accountAddress,
            network: Network.Mainnet,
            action: async (signer) => {
                const keyPair = await createKeyPairFromBytes(signer.secretKey)
                const kitSigner = await createSignerFromKeyPair(keyPair)
                const { value: latestBlockhash } = await rpc.getLatestBlockhash().send()
                const transactionMessage = pipe(
                    createTransactionMessage({ version: 0 }),
                    (tx) => addSignersToTransactionMessage([kitSigner, ...positionKeyPairs], tx),
                    (tx) => setTransactionMessageFeePayerSigner(kitSigner, tx),
                    (tx) => appendTransactionMessageInstructions(instructions, tx),
                    (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
                )
                if (!isTransactionMessageWithinSizeLimit(transactionMessage)) {
                    throw new TransactionMessageTooLargeException("Transaction message is too large")
                }
                const transaction = compileTransaction(transactionMessage)
                // sign the transaction
                const signedTransaction = await signTransaction(
                    [keyPair, ...positionKeyPairs.map((keyPair) => keyPair.keyPair)],
                    transaction,
                )
                assertIsSendableTransaction(signedTransaction)
                assertIsTransactionWithinSizeLimit(signedTransaction)
                const sendAndConfirmTransaction = sendAndConfirmTransactionFactory({
                    rpc,
                    rpcSubscriptions,
                })
                // const transactionSignature = getSignatureFromTransaction(signedTransaction)
                // await sendAndConfirmTransaction(signedTransaction, { commitment: "confirmed" })
                // this.logger.info(WinstonLog.OpenPositionSuccess, {
                //     txHash: transactionSignature.toString(),
                //     bot: bot.id,
                // })
                // return transactionSignature.toString()
                const stimulateTransaction = await rpc.simulateTransaction(
                    getBase64EncodedWireTransaction(signedTransaction),
                    {
                        commitment: "confirmed",
                        encoding: "base64",
                    },
                ).send()
                console.log(stimulateTransaction.value.logs)
            },
        })
    }
}
