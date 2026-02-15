import {
    Injectable
} from "@nestjs/common"
import {
    createKeyPairFromPrivateKeyBytes,
    signTransaction,
    getSignatureFromTransaction,
    Instruction,
    createTransactionMessage,
    pipe,
    setTransactionMessageFeePayerSigner,
    createNoopSigner,
    address,
    addSignersToTransactionMessage,
    createSignerFromKeyPair,
    TransactionSigner,
    appendTransactionMessageInstructions,
    compileTransaction,
} from "@solana/kit"
import {
    RpcExecutorService
} from "../rpc"
import {
    SignedTx,
} from "../../types"
import {
    RpcAccessType
} from "@modules/filesystem"
import type {
    SignSolanaTxParams,
} from "./types"
import {
    InjectSuperJson 
} from "@modules/mixin"
import SuperJSON from "superjson"
import bs58 from "bs58"
import {
    AppVersion 
} from "@modules/databases"
import {
    PrivySignService
} from "@modules/privy"
import {
    SignerService
} from "../../signers"
import {
    ChainId 
} from "@modules/common"
import {
    EncryptedPrivySignerPrivateKeyNotFoundException, 
    PrivyMetadataNotFoundException,
} from "@modules/exceptions"
import {
    WinstonLog, WinstonService 
} from "@modules/winston"
/**
 * Service for building Solana transactions with latest blockhash.
 * Fetches latest blockhash via RPC and returns compiled transaction + blockhash for signing/lifetime.
 *
 * @example
 * const { latestBlockhash, transaction } = await solanaTxService.createSolanaTx({
 *   bot,
 *   instructions: openPositionInstructions,
 * })
 */
@Injectable()
export class SolanaTxService {
    constructor(
        private readonly rpcExecutorService: RpcExecutorService,
        @InjectSuperJson()
        private readonly superJson: SuperJSON,
        private readonly signerService: SignerService,
        private readonly privySignService: PrivySignService,
        private readonly winstonService: WinstonService,
    ) {}

    /**
     * Signs a Solana transaction message.
     *
     * @param params.bot - Bot (fee payer: bot.accountAddress)
     * @param params.prepareTx - Prepared transaction
     * @returns signed transaction
     */
    async signTx(
        {
            bot,
            prepareTx,
            liquidityPool,
            transactionType,
        }: SignSolanaTxParams): Promise<SignedTx> {
        const latestBlockhash = await this.rpcExecutorService.withSolanaRpc({
            accessType: RpcAccessType.Http,
            callback: async ({ rpc }) => {
                return await rpc.getLatestBlockhash().send()
            },
        })
        // retrieve solana tx from serialized tx
        const instructions = this.superJson.parse<Array<Instruction>>(prepareTx.serializedTx)
        let cryptoSigners: Array<TransactionSigner> = []
        if (prepareTx.privateKeys?.length) {
            // create keypairs from private keys
            cryptoSigners = await Promise.all(
                prepareTx.privateKeys.map((privateKey) => 
                    createKeyPairFromPrivateKeyBytes(
                        bs58.decode(privateKey)
                    ).then((keyPair) => createSignerFromKeyPair(keyPair))
                )
            )
        }
        const solanaTx = pipe(
            createTransactionMessage({
                version: 0,
            }),
            (tx) => setTransactionMessageFeePayerSigner(
                createNoopSigner(address(bot.accountAddress)),
                tx,
            ),
            (tx) => addSignersToTransactionMessage([
                createNoopSigner(address(bot.accountAddress)),
                ...cryptoSigners,
            ],
            tx,
            ),
            (tx) => appendTransactionMessageInstructions(instructions,
                tx),
            (tx) => compileTransaction(tx),
        )
        
        // sign transaction bytes
        let signedTx: SignedTx
        // sign with V1 signer
        if (bot.version === AppVersion.V1) {
            const signedTransaction = await this.signerService.withSolanaSigner(
                {
                    bot,
                    action: async (signer) => {
                        return signTransaction(
                            [signer.keyPair],
                            solanaTx,
                        )
                    },
                }
            )
            const txHash = getSignatureFromTransaction(signedTransaction)
            signedTx = {
                txHash,
                signedSerializedTx: this.superJson.stringify(signedTransaction),
                chainId: ChainId.Solana,
            }
        } else {
            if (!bot.privyMetadata?.walletId) {
                throw new PrivyMetadataNotFoundException({
                    botId: bot.id,
                })
            }
            if (!bot.encryptedPrivySignerPrivateKeyPayload) {
                throw new EncryptedPrivySignerPrivateKeyNotFoundException({
                    botId: bot.id,
                })
            }
            const { txHash } = await this.privySignService.signSolanaTransaction(
                {
                    transaction: solanaTx,
                    lifetimeConstraint: {
                        blockhash: latestBlockhash.value.blockhash,
                        lastValidBlockHeight: latestBlockhash.value.lastValidBlockHeight,
                    },
                    walletId: bot.privyMetadata.walletId,
                    encryptedPrivySignerPrivateKey: bot.encryptedPrivySignerPrivateKeyPayload,
                }
            )
            signedTx = {
                txHash,
                signedSerializedTx: this.superJson.stringify(solanaTx),
                chainId: ChainId.Solana,
            }
        }
        // stage: logging
        this.winstonService.log(
            WinstonLog.TransactionSigned,
            {
                botId: bot.id,
                txHash: signedTx.txHash,
                liquidityPoolId: liquidityPool?.displayId,
                type: transactionType,
                chainId: ChainId.Solana,
            }
        )
        return signedTx
    }
}
