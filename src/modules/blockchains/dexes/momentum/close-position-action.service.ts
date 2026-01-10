import { Injectable } from "@nestjs/common"
import {
    ExecuteClosePositionParams,
    IClosePositionActionService,
    LiquidityPoolState,
    PrepareClosePositionParams,
    PrepareClosePositionResponse,
} from "../../interfaces"
import { TransactionDataBuilder } from "@mysten/sui/transactions"
import { SignerService } from "../../signers"
import { ClosePositionTxbService } from "./transactions"
import { 
    ActivePositionNotFoundException,
    TransactionNotPreparedException,
    TransactionNotExecutedException,
    PrivyPublicKeyNotFoundException,
} from "@exceptions"
import { RpcExecutorService } from "../../clients"
import { RpcAccessType } from "@modules/filesystem"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"
import { AsyncService } from "@modules/mixin"
import { PrivySignService } from "@modules/privy"
import { AppVersion } from "@modules/databases"

@Injectable()
export class MomentumClosePositionActionService implements IClosePositionActionService {
    constructor(
        private readonly signerService: SignerService,
        private readonly closePositionTxbService: ClosePositionTxbService,
        private readonly asyncService: AsyncService,
        private readonly rpcExecutorService: RpcExecutorService,
        private readonly privySignService: PrivySignService,
        @InjectWinston()
        private readonly logger: WinstonLogger,
    ) {}

    async prepare(
        { bot, state }: PrepareClosePositionParams
    ): Promise<PrepareClosePositionResponse> {
        const _state = state as LiquidityPoolState
        if (!bot.activePosition) {
            throw new ActivePositionNotFoundException(
                bot.id, 
                "Active position not found"
            )
        }
        const {
            txb: closePositionTxb,
        } = await this.closePositionTxbService.createClosePositionTxb({
            bot,
            state: _state,
        })
        return await this.rpcExecutorService.withSuiClient({
            accessType: RpcAccessType.Write,
            callback: async ({ suiClient }) => {
                if (bot.version === AppVersion.V1) {
                    return await this.signerService.withSuiSigner({
                        bot,
                        action: async (signer) => {
                            const bytes = await closePositionTxb.build({
                                client: suiClient,
                            })
                            const txHash = TransactionDataBuilder.getDigestFromBytes(bytes)
                            const signatureWithBytes = await signer.signTransaction(bytes)
                            return {
                                txHash,
                                signatureWithBytes,
                            }
                        },
                    })
                } else {
                    if (!bot.privyMetadata.walletPublicKey) {
                        throw new PrivyPublicKeyNotFoundException("Privy public key not found")
                    }
                    const { txHash, signatureWithBytes } = await this.privySignService.signSuiTransaction({
                        publicKeyHex: bot.privyMetadata.walletPublicKey,
                        client: suiClient,
                        walletId: bot.privyMetadata.walletId,
                        transaction: closePositionTxb,
                        encryptedPrivySignerPrivateKey: bot.encryptedPrivySignerPrivateKeyPayload,
                    })
                    return {
                        txHash,
                        signatureWithBytes,
                    }
                }
            },
        })
    }

    async execute(
        { bot, state, isRetry, signatureWithBytes, txHash }: ExecuteClosePositionParams
    ): Promise<void> {
        const _state = state as LiquidityPoolState
        if (!bot.activePosition) {
            throw new ActivePositionNotFoundException(
                bot.id, 
                "Active position not found"
            )
        }
        if (isRetry) {
            const [txBlock] = await this.asyncService.resolveTuple(
                this.rpcExecutorService.withSuiClient({
                    accessType: RpcAccessType.Read,
                    callback: async ({ suiClient }) => {
                        return suiClient.getTransactionBlock({
                            digest: txHash,
                        })
                    },
                })
            )
            if (txBlock !== null) {
                return
            }
            throw new TransactionNotExecutedException("Transaction not executed")
        }
        if (!signatureWithBytes) {
            throw new TransactionNotPreparedException("Transaction not prepared")
        }
        await this.rpcExecutorService.withSuiClient({
            accessType: RpcAccessType.Write,
            callback: async ({ suiClient }) => {
                const { digest } = await suiClient.executeTransactionBlock({
                    transactionBlock: signatureWithBytes.bytes,
                    signature: signatureWithBytes.signature
                })
                await suiClient.waitForTransaction({
                    digest,
                })
                this.logger.verbose(
                    WinstonLog.ClosePositionExecuted, {
                        botId: bot.id,  
                        txHash: digest,
                        liquidityPoolId: _state.static.displayId,
                    }
                )
            },
        })
    }
}
