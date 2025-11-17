import { Injectable } from "@nestjs/common"
import { PrimaryMemoryStorageService, TokenId } from "@modules/databases"
import BN from "bn.js"
import { InjectSolanaClients } from "../clients"
import { HttpAndWsClients } from "../clients"
import { ChainId, Network } from "@modules/common"
import { Connection } from "mongoose"
import { InvalidTokenPlatformException, MinGasRequiredNotFoundException, MinTargetTokenRequiredNotFoundException, TokenNotFoundException } from "@exceptions"
import { fetchToken as fetchToken2022, TOKEN_2022_PROGRAM_ADDRESS } from "@solana-program/token-2022"
import { address } from "@solana/kit"
import { fetchToken, findAssociatedTokenPda, TOKEN_PROGRAM_ADDRESS } from "@solana-program/token"
import { RetryService } from "@modules/mixin"
import { computeRaw, toScaledBN, toUnit, ZERO_BN } from "@utils"
import { chainIdToPlatformId, PlatformId, TokenType } from "@typedefs"
import Decimal from "decimal.js"

@Injectable()
export class SolanaTokenManagerService {
    constructor(
        @InjectSolanaClients()
        private readonly solanaClients: Record<Network, HttpAndWsClients<Connection>>,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly retryService: RetryService,
    ) {}

    public async fetchBalanceAmount({
        tokenId,
        accountAddress,
        network = Network.Mainnet,
        clientIndex = 0,
    }: FetchBalanceAmountParams): Promise<BN> {
        return await this.retryService.retry({
            action: async () => {
                const client = this.solanaClients[network][clientIndex]
                const connection = client.http
    
                // Look up token metadata from local storage
                const token = this.primaryMemoryStorageService.tokens.find(
                    (token) => token.id === tokenId.toString()
                )
                if (!token) {
                    throw new TokenNotFoundException("Token not found")
                }
                if (chainIdToPlatformId(token.chainId) !== PlatformId.Solana) throw new InvalidTokenPlatformException()
    
                const mintAddress = address(token.tokenAddress)
                const owner = address(accountAddress)
    
                // Derive the user's associated token account (ATA)
                // This is required because balances are stored in ATA, not in the owner wallet directly.
                const [ataAddress] = await findAssociatedTokenPda(
                    {
                        mint: mintAddress,
                        owner: owner,
                        tokenProgram: token.is2022Token ? TOKEN_2022_PROGRAM_ADDRESS : TOKEN_PROGRAM_ADDRESS,
                    }
                )
    
                // Token-2022 accounts are handled by the newer token-2022 program.
                try {
                    if (token.is2022Token) {
                        const token2022 = await fetchToken2022(connection, ataAddress)
                        return new BN(token2022.data.amount.toString())
                    } else {
                        // Standard SPL token account
                        const tokenAccount = await fetchToken(connection, ataAddress)
                        return new BN(tokenAccount.data.amount.toString())
                    }
                } catch {
                    // we dont find the ata address, so the balance is 0
                    return new BN(0)
                }
            }
        })
    }

    public async fetchUsableBalanceAmount({
        tokenId,
        accountAddress,
        network = Network.Mainnet,
        clientIndex = 0,
    }: FetchUsableBalanceAmountParams): Promise<BN> {
        const gasConfig = this.primaryMemoryStorageService.gasConfig
        const token = this.primaryMemoryStorageService.tokens.find(
            (token) => token.id === tokenId.toString()
        )
        if (!token) {
            throw new TokenNotFoundException("Token not found")
        }
        const gasAmount = gasConfig.minGasRequired?.[ChainId.Solana]?.[network]
        if (!gasAmount) {
            throw new MinGasRequiredNotFoundException(ChainId.Solana, network, "Min gas required not found")
        }
        const balance = await this.fetchBalanceAmount({ tokenId, accountAddress, network, clientIndex })
        if (token.type === TokenType.Native) {  
            return BN.max(ZERO_BN, balance.sub(new BN(gasAmount)))
        }
        return balance
    }

    public async getAccountFunding({
        targetTokenId,
        gasTokenId,
        accountAddress,
        network = Network.Mainnet,
        clientIndex = 0,
        oraclePrice,
    }: GetAccountFundingParams): Promise<GetAccountFundingResponse> {
        const { targetTokenConfig, gasConfig, tokens } = this.primaryMemoryStorageService
        // ---- load tokens & configs ----
        const gasToken = tokens.find(token => token.id === gasTokenId.toString())
        if (!gasToken) throw new TokenNotFoundException("Gas token not found")
        if (chainIdToPlatformId(gasToken.chainId) !== PlatformId.Solana) throw new InvalidTokenPlatformException()
        const targetToken = tokens.find(token => token.id === targetTokenId.toString())
        if (!targetToken) throw new TokenNotFoundException("Target token not found")
        if (chainIdToPlatformId(targetToken.chainId) !== PlatformId.Solana) throw new InvalidTokenPlatformException()
        const gasAmount = gasConfig.minGasRequired?.[ChainId.Solana]?.[network]
        if (!gasAmount) throw new MinGasRequiredNotFoundException(ChainId.Solana, network)
    
        const minTargetTokenRequired =
            targetTokenConfig.minTargetTokenRequired?.[targetTokenId]?.[network]
        if (!minTargetTokenRequired) {
            throw new MinTargetTokenRequiredNotFoundException(targetTokenId, network)
        }
    
        // ---- convert config to raw (BN) ----
        const rawGasRequired = computeRaw(gasAmount, gasToken.decimals)
        const rawMinTargetRequired = computeRaw(minTargetTokenRequired, targetToken.decimals)
    
        // =====================================================================================
        // CASE 1: target token *is also gas token*
        // =====================================================================================
        if (targetTokenId === gasTokenId) {
            const usableBalance = await this.fetchUsableBalanceAmount({
                tokenId: targetTokenId,
                accountAddress,
                network,
                clientIndex,
            })
            // insufficient gas
            if (usableBalance.eq(ZERO_BN)) {
                return {
                    status: AccountFundingStatus.InsufficientGas,
                    remainingTargetTokenBalanceAmount: ZERO_BN,
                    gasTokenBalanceAmount: ZERO_BN,
                    gasTokenSwapAmount: ZERO_BN,
                }
            }
            // insufficient target token
            if (usableBalance.lt(rawMinTargetRequired)) {
                return {
                    status: AccountFundingStatus.InsufficientTargetToken,
                    remainingTargetTokenBalanceAmount: usableBalance,
                    gasTokenBalanceAmount: ZERO_BN,
                    gasTokenSwapAmount: ZERO_BN,
                }
            }
            // OK
            return {
                status: AccountFundingStatus.OK,
                remainingTargetTokenBalanceAmount: usableBalance,
                gasTokenBalanceAmount: rawGasRequired,
                gasTokenSwapAmount: ZERO_BN,
            }
        }

        // =====================================================================================
        // CASE 2: target token ≠ gas token
        // =====================================================================================
        const gasBalance = await this.fetchBalanceAmount({
            tokenId: gasTokenId,
            accountAddress,
            network,
            clientIndex,
        })
        const targetBalance = await this.fetchBalanceAmount({
            tokenId: targetTokenId,
            accountAddress,
            network,
            clientIndex,
        })
        // gas < required
        if (gasBalance.lt(rawGasRequired)) {
            // AND also target < required → cannot swap for gas → insufficient gas
            if (!oraclePrice) {
                throw new Error("Oracle price is required for gas low but convertible")
            }
            const swapToGasAmount = computeRaw(gasAmount, gasToken.decimals)
            // x = decimalsSwap / decimalsX * swapToGasAmount / oraclePrice
            const targetSwapAmountRequired = toScaledBN(toUnit(targetToken.decimals), 
                new Decimal(1).div(new Decimal(oraclePrice)
                ))
                .mul(swapToGasAmount).div(toUnit(gasToken.decimals))
            const targetBalanceAmountAfterSwap = targetBalance.sub(targetSwapAmountRequired)

            if (targetBalanceAmountAfterSwap.lt(rawMinTargetRequired)) {
                return {
                    status: AccountFundingStatus.InsufficientGas,
                    remainingTargetTokenBalanceAmount: targetBalance,
                    gasTokenBalanceAmount: gasBalance,
                    gasTokenSwapAmount: ZERO_BN,
                }
            }
            // gas low BUT convertible (target > min)
            return {
                status: AccountFundingStatus.GasLowButConvertible,
                remainingTargetTokenBalanceAmount: targetBalanceAmountAfterSwap,
                gasTokenBalanceAmount: gasBalance,
                gasTokenSwapAmount: targetSwapAmountRequired, // can fill later when you compute route
            }
        }
        // gas OK → fully healthy
        return {
            status: AccountFundingStatus.OK,
            remainingTargetTokenBalanceAmount: targetBalance,
            gasTokenBalanceAmount: gasBalance,
            gasTokenSwapAmount: ZERO_BN,
        }
    }
}

export interface FetchBalanceAmountParams {
    tokenId: TokenId
    accountAddress: string
    network?: Network
    clientIndex?: number
}

export type FetchUsableBalanceAmountParams = FetchBalanceAmountParams

export interface GetAccountFundingParams {
    // target token id to check
    targetTokenId: TokenId
    // gas token id to check
    gasTokenId: TokenId
    accountAddress: string
    network?: Network
    clientIndex?: number
    // oracle price of the target token with the gas token
    // swapToGasAmount/x. eg USDC/SUI => 0.5
    oraclePrice?: number
}

export enum AccountFundingStatus {
    OK = "ok",
    InsufficientGas = "InsufficientGas",
    InsufficientTargetToken = "InsufficientTargetToken",
    GasLowButConvertible = "GasLowButConvertible",
}

export interface GetAccountFundingResponse {
    status: AccountFundingStatus
    remainingTargetTokenBalanceAmount: BN
    gasTokenBalanceAmount: BN
    gasTokenSwapAmount: BN
}