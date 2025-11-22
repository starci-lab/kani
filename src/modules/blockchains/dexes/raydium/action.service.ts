import { Injectable } from "@nestjs/common"
import { IActionService, OpenPositionParams } from "../../interfaces"
import { PoolUtils, Raydium, TxVersion } from "@raydium-io/raydium-sdk-v2"
import { Connection } from "mongoose"
import {
    InjectPrimaryMongoose,
} from "@modules/databases"
import { SignerService } from "../../signers"
import { PrimaryMemoryStorageService } from "@modules/databases"
import { 
    InvalidPoolTokensException, 
    LiquidityAmountsNotAcceptableException,
    SnapshotBalancesNotSetException,
} from "@exceptions"
import { TickMathService } from "../../math"
import { Network } from "@typedefs"
import { RAYDIUM_CLIENTS_INDEX } from "./constants"
import { InjectSolanaClients, OPEN_POSITION_SLIPPAGE } from "@modules/blockchains"
import { HttpAndWsClients } from "../../clients"
import { PublicKey, Connection as SolanaConnection } from "@solana/web3.js"
import { 
    createSolanaRpc,
    createKeyPairFromBytes,
    signTransaction,
    getBase64EncodedWireTransaction,
} from "@solana/kit"

import { InjectRaydiumClmmSdk } from "./raydium.decorators"
import BN from "bn.js"
import { fromVersionedTransaction } from "@solana/compat"
import { Decimal } from "decimal.js"
import { TransactionWithLifetime } from "../../types"
import { EnsureMathService } from "../../math"
import { BalanceService } from "../../balance"
import { BalanceSnapshotService, OpenPositionService } from "../../snapshots"

@Injectable()
export class RaydiumActionService implements IActionService {
    constructor(
        @InjectRaydiumClmmSdk()
        private readonly raydiumClmmSdk: Raydium,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        @InjectSolanaClients()
        private readonly solanaClients: Record<Network, HttpAndWsClients<SolanaConnection>>,
        private readonly signerService: SignerService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly tickMathService: TickMathService,
        private readonly ensureMathService: EnsureMathService,
        private readonly balanceService: BalanceService,
        private readonly balanceSnapshotService: BalanceSnapshotService,
        private readonly openPositionService: OpenPositionService,
    ) { }

    async closePosition(): Promise<void> {
    }

    async openPosition(
        {
            targetIsA,
            state,
            network = Network.Mainnet,
            bot,
            slippage
        }: OpenPositionParams
    ) {
        const {
            snapshotTargetBalanceAmount,
            snapshotQuoteBalanceAmount,
            snapshotGasBalanceAmount
        } = bot
        if (!snapshotTargetBalanceAmount || !snapshotQuoteBalanceAmount) {
            throw new SnapshotBalancesNotSetException("Snapshot balances not set")
        }
        const client = this.solanaClients[network].http[RAYDIUM_CLIENTS_INDEX]
        const rpc = createSolanaRpc(client.rpcEndpoint)
        slippage = slippage || OPEN_POSITION_SLIPPAGE
        // check if the tokens are in the pool
        const tokenA = this.primaryMemoryStorageService.tokens
            .find((token) => token.id === state.static.tokenA.toString())
        const tokenB = this.primaryMemoryStorageService.tokens
            .find((token) => token.id === state.static.tokenB.toString())
        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException("Either token A or token B is not in the pool")
        }
        // get the tick bounds
        const { 
            tickLower, 
            tickUpper
        } = await this.tickMathService.getTickBounds({
            state,
            bot,
        })
        this.raydiumClmmSdk.setOwner(new PublicKey(bot.accountAddress))
        await this.raydiumClmmSdk.account.fetchWalletTokenAccounts()
        const { 
            poolInfo, 
            poolKeys,
        } = await this.raydiumClmmSdk.clmm.getPoolInfoFromRpc(state.static.poolAddress)
        
        const epochInfo = await this.raydiumClmmSdk.fetchEpochInfo()
        const res = await PoolUtils.getLiquidityAmountOutFromAmountIn({
            poolInfo,
            slippage: slippage.toNumber(),
            inputA: true,
            tickUpper: Decimal.max(tickUpper, tickLower).toNumber(),
            tickLower: Decimal.min(tickUpper, tickLower).toNumber(),
            amount: new BN(snapshotTargetBalanceAmount),
            add: true,
            amountHasFee: true,
            epochInfo,
        })
        const actualQuoteAmount = targetIsA ? res.amountB.amount : res.amountA.amount
        const ensureQuoteTokenResponse = this.ensureMathService.ensureBetween({
            actual: actualQuoteAmount,
            expected: new BN(snapshotQuoteBalanceAmount),
            upperBound: new Decimal(1),
            lowerBound: new Decimal(0.95),
        })
        if (!ensureQuoteTokenResponse.isAcceptable) {
            throw new LiquidityAmountsNotAcceptableException(
                ensureQuoteTokenResponse.ratio, 
                "Liquidity amounts are not acceptable"
            )
        }
        // open the position
        const { 
            extInfo: {
                address: {
                    positionNftAccount
                }
            },
            transaction: openPositionLegacyTransaction
        } = await this.raydiumClmmSdk.clmm.openPositionFromLiquidity(
            {
                poolInfo,
                poolKeys,
                tickUpper: Decimal.max(
                    tickLower.toNumber(), 
                    tickUpper.toNumber()
                ).toNumber(),
                tickLower: Decimal.min(
                    tickLower.toNumber(), 
                    tickUpper.toNumber()
                ).toNumber(),
                amountMaxA: res.amountA.amount,
                amountMaxB: res.amountB.amount,
                liquidity: res.liquidity,
                ownerInfo: {
                    useSOLBalance: true,
                },
                txVersion: TxVersion.V0,
                nft2022: true,
                feePayer: new PublicKey(bot.accountAddress),
                computeBudgetConfig: {
                    units: 600000,
                    microLamports: 10000,
                },
            }
        )
        // convert the transaction to a transaction with lifetime
        const openPositionTransaction = fromVersionedTransaction(
            openPositionLegacyTransaction
        ) as TransactionWithLifetime
        // sign the transaction
        const txHash = await this.signerService.withSolanaSigner({
            bot,
            accountAddress: bot.accountAddress,
            network,
            action: async (signer) => {
                const keyPair = await createKeyPairFromBytes(signer.secretKey)
                // set the lifetime constraint
                const signedTransaction = await signTransaction(
                    [keyPair],
                    openPositionTransaction,
                )
                const transactionDigest = await rpc.sendTransaction(
                    getBase64EncodedWireTransaction(signedTransaction),
                    {
                        encoding: "base64",
                        preflightCommitment: "confirmed",
                    }).send()
                const {
                    value: {
                        blockhash,
                        lastValidBlockHeight,
                    }
                } = await rpc.getLatestBlockhash().send()
                await client.confirmTransaction({
                    blockhash,
                    lastValidBlockHeight: Number(lastValidBlockHeight),
                    signature: transactionDigest.toString(),
                })
                return transactionDigest.toString()
            },
        })
        // we refetch the balances after the position is opened
        const {
            quoteBalanceAmount: adjustedQuoteBalanceAmount,
            targetBalanceAmount: adjustedTargetBalanceAmount,
            gasBalanceAmount: adjustedGasBalanceAmount,
        } = await this.balanceService.fetchBalances({
            bot,
        })
        const session = await this.connection.startSession()
        await session.withTransaction(
            async () => {
                await this.openPositionService.addOpenPositionTransactionRecord({
                    targetAmountUsed: 
            new BN(snapshotTargetBalanceAmount)
                .sub(new BN(adjustedTargetBalanceAmount)),
                    quoteAmountUsed: 
            new BN(snapshotQuoteBalanceAmount)
                .sub(new BN(adjustedQuoteBalanceAmount)),
                    liquidity: new BN(res.liquidity),
                    gasAmountUsed: snapshotGasBalanceAmount ? 
                        new BN(snapshotGasBalanceAmount)
                            .sub(adjustedGasBalanceAmount ? 
                                new BN(adjustedGasBalanceAmount   
                                ) : new BN(0))
                        : undefined,
                    bot,
                    targetIsA,
                    tickLower: tickLower.toNumber(),
                    tickUpper: tickUpper.toNumber(),
                    network,
                    chainId: bot.chainId,
                    liquidityPoolId: state.static.displayId,
                    positionId: positionNftAccount.toString(),
                    openTxHash: txHash,
                    session,
                })
                await this.balanceSnapshotService.updateBotSnapshotBalancesRecord({
                    bot,
                    targetBalanceAmount: adjustedTargetBalanceAmount,
                    quoteBalanceAmount: adjustedQuoteBalanceAmount,
                    gasAmount: adjustedGasBalanceAmount,
                    session,
                })
            })
    }
}

