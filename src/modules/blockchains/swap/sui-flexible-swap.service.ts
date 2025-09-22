import { Injectable } from "@nestjs/common"
import { Network, ZERO_BN } from "@modules/common"
import { 
    SuiCoinManagerService,
    SuiExecutionService,  
} from "../utils"
import { SuiSwapService } from "./sui-swap.service"
import { SuiFlexibleSwapParams, SuiFlexibleSwapResponse } from "../interfaces"
import { Transaction } from "@mysten/sui/transactions"
import { TokenId } from "@modules/databases"
import { CoinArgument } from "../types"
import { FeeToService } from "./fee-to.service"
import { SignerService } from "../signers"
import { SuiClient } from "@mysten/sui/client"
import { InjectSuiClients } from "../clients"

@Injectable()
export class SuiFlexibleSwapService {
    constructor(
    private readonly suiSwapService: SuiSwapService,
    private readonly suiCoinManagerService: SuiCoinManagerService,
    private readonly feeToService: FeeToService,
    private readonly signerService: SignerService,
    private readonly suiExecutionService: SuiExecutionService,
    @InjectSuiClients()
    private readonly suiClients: Record<Network, Array<SuiClient>>,
    ) {}

    /**
   * Force swap all tokenIns → tokenOut
   * No slippage protection
   */
    async suiFlexibleSwap({
        network = Network.Mainnet,
        tokenOut,
        txb,
        tokens,
        slippage,
        accountAddress,
        suiTokenIns,
        depositAmount,
        user,
        stimulateOnly = false,
        suiClient
    }: SuiFlexibleSwapParams
    ): Promise<SuiFlexibleSwapResponse> {
        // use first client if not provided
        // we will iterate through all suiTokenIns and swap them to tokenOut
        txb = txb || new Transaction()
        if (!user) {
            throw new Error("User is required")
        }
        suiClient = suiClient || this.suiClients[network][0]
        let estimatedAmountOut = ZERO_BN
        const coinOuts: Array<CoinArgument> = []
        for (const tokenId of Object.keys(suiTokenIns)) {
            const _tokenId = tokenId as TokenId
            const amountIn = suiTokenIns[_tokenId]
            if (!amountIn) {
                throw new Error("Amount in is required")
            }
            const token = tokens.find(token => token.displayId === _tokenId)
            if (!token) {
                throw new Error("Token not found")
            }
            if (_tokenId === tokenOut) {
                // if the tokenId is the tokenOut, we will add the amount of the tokenIns to the estimated amount out
                estimatedAmountOut = 
                estimatedAmountOut
                    .add(
                        amountIn
                    )
                continue
            }
            const { sourceCoin } = await this.suiCoinManagerService.fetchAndMergeCoins({
                txb,
                coinType: token.tokenAddress,
                suiClient,
                owner: accountAddress,
                requiredAmount: amountIn,
            })
            const { routerId, quoteData, amountOut } = await this.suiSwapService.quote({
                tokenIn: _tokenId,
                tokenOut,
                tokens,
                amountIn: sourceCoin.coinAmount,
                network
            })
            const { coinOut } = await this.suiSwapService.swap({
                tokenIn: _tokenId,
                tokenOut,
                tokens,
                amountIn: sourceCoin.coinAmount,
                network,
                fromAddress: accountAddress,
                txb,
                slippage,
                inputCoin: sourceCoin,
                quoteData,
                routerId,
                transferCoinObjs: false,
            })
            estimatedAmountOut = estimatedAmountOut.add(amountOut)
            if (!coinOut) {
                throw new Error("Coin out is required")
            }
            coinOuts.push(coinOut)
        }
        // if the estimated amount out is greater than the deposit amount
        // we will charge 10% as roi fee
        if (coinOuts.length > 0) {
            const mergedCoinOut = this.suiCoinManagerService.mergeCoins(txb, coinOuts)
            if (estimatedAmountOut.gt(depositAmount)) {
                this.feeToService.attachSuiRoiFee({
                    txb,
                    amount: estimatedAmountOut.sub(depositAmount),
                    tokenId: tokenOut,
                    tokens,
                    network,
                    sourceCoin: mergedCoinOut,
                })
            }
            // transfer the merged coin out to the account address
            txb.transferObjects([mergedCoinOut.coinArg], accountAddress)
        } 
        const txHash = await this.signerService.withSuiSigner({
            user,
            network,
            action: async (signer) => {
                return await this.suiExecutionService.signAndExecuteTransaction({
                    transaction: txb,
                    suiClient,
                    stimulateOnly,
                    signer,
                })
            },
        })
        return { 
            receivedAmountOut: estimatedAmountOut, 
            profitAmount: estimatedAmountOut.sub(depositAmount),
            txHash
        }
    }
}