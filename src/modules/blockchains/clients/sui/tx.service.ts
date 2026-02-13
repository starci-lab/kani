import {
    Injectable 
} from "@nestjs/common"
import {
    RpcAccessType 
} from "@modules/filesystem"
import {
    SignedTx, 
} from "../../types"
import {
    RpcExecutorService 
} from "../rpc-executor.service"
import {
    SignerService 
} from "../../signers"
import {
    SignSuiTransactionParams
} from "./types"
import {
    TransactionDataBuilder 
} from "@mysten/sui/transactions"
import {
    AppVersion 
} from "@modules/databases"
import {
    PrivySignService 
} from "@modules/privy"
import {
    EncryptedPrivySignerPrivateKeyNotFoundException, 
    PrivyMetadataNotFoundException, 
    PrivyPublicKeyNotFoundException 
} from "@modules/exceptions"
/**
 * Service for building Sui transactions.
 */
@Injectable()
export class SuiTxService {
    constructor(
        private readonly rpcExecutorService: RpcExecutorService,
        private readonly signerService: SignerService,
        private readonly privySignService: PrivySignService,
    ) {}
    /**
     * Builds a Sui transaction.
     * @param params - The parameters for building the Sui transaction.
     * @param params.bot - The bot schema.
     * @param params.tx - The transaction to build.
     * @returns The prepared transaction.
     */
    async signTx(
        { 
            bot, 
            tx 
        }: SignSuiTransactionParams
    ): Promise<SignedTx> {
        // build transaction bytes
        const bytes = await this.rpcExecutorService.withSuiClient({
            accessType: RpcAccessType.Http,
            callback: async ({ suiClient }) => {
                return await tx.build({
                    client: suiClient,
                })
            },
        })
        // sign transaction bytes
        let signedTx: SignedTx
        // sign with V1 signer
        if (bot.version === AppVersion.V1) {
            const signatureWithBytes = await this.signerService.withSuiSigner({
                bot,
                action: async (signer) => {
                    return await signer.signTransaction(bytes)
                },
            })
            const txHash = TransactionDataBuilder.getDigestFromBytes(bytes)
            signedTx = {
                txHash,
                signatureWithBytes
            }
        } else {
            // sign with Privy signer
            const { txHash, signatureWithBytes } =
            await this.rpcExecutorService.withSuiClient({
                accessType: RpcAccessType.Http,
                callback: async ({ suiClient }) => {
                    if (!bot.privyMetadata?.walletPublicKey) {
                        throw new PrivyPublicKeyNotFoundException({
                            botId: bot.id,
                        })
                    }
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
                    const { txHash, signatureWithBytes } = await this.privySignService.signSuiTransaction(
                        {
                            publicKeyHex: bot.privyMetadata.walletPublicKey,
                            client: suiClient,
                            walletId: bot.privyMetadata.walletId,
                            transaction: tx,
                            encryptedPrivySignerPrivateKey: bot.encryptedPrivySignerPrivateKeyPayload,
                        }
                    )
                    return {
                        txHash,
                        signatureWithBytes,
                    }
                },
            })
            signedTx = {
                txHash,
                signatureWithBytes,
            }
        }
        return signedTx
    }
}