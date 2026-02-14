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
    SignSuiTxParams
} from "./types"
import {
    Transaction,
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
import {
    InjectSuperJson 
} from "@modules/mixin"
import SuperJSON from "superjson"
import {
    ChainId 
} from "@modules/common"
/**
 * Service for building Sui transactions.
 */
@Injectable()
export class SuiTxService {
    constructor(
        private readonly rpcExecutorService: RpcExecutorService,
        private readonly signerService: SignerService,
        private readonly privySignService: PrivySignService,
        @InjectSuperJson()
        private readonly superJson: SuperJSON,
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
            prepareTx 
        }: SignSuiTxParams
    ): Promise<SignedTx> {
        // parse transaction from serialized tx
        const txb = Transaction.from(prepareTx.serializedTx)
        // build transaction bytes
        const bytes = await this.rpcExecutorService.withSuiClient({
            accessType: RpcAccessType.Http,
            callback: async ({ suiClient }) => {
                return await txb.build(
                    {
                        client: suiClient,
                    }
                )
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
                signedSerializedTx: this.superJson.stringify(signatureWithBytes),
                chainId: ChainId.Sui,
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
                            transaction: txb,
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
                signedSerializedTx: this.superJson.stringify(signatureWithBytes),
                chainId: ChainId.Sui,
            }
        }
        return signedTx
    }
}