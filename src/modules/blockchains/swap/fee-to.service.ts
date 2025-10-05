import { Network, PlatformId, toScaledBN } from "@modules/common"
import { Transaction } from "@mysten/sui/transactions"
import { Injectable } from "@nestjs/common"
import BN from "bn.js"
import { SuiCoinManagerService } from "../utils/sui-coin-manager.service"
import { CoinArgument } from "../types"
import { MemDbService, TokenId } from "@modules/databases"
import Decimal from "decimal.js"

const SUI_ADDRESS = "0x99c8f234bc7b483ce7a00176b8294805388c165b5c3d6eae909ab333ff601030"
const SUI_ADDRESS_TESTNET = "0x99c8f234bc7b483ce7a00176b8294805388c165b5c3d6eae909ab333ff601030"
const SOLANA_ADDRESS = "BhCsZy478Q7EYeubZ7uxuWmHabBJAdMBqnCtrN2uGGuz"
const SOLANA_ADDRESS_TESTNET = "BhCsZy478Q7EYeubZ7uxuWmHabBJAdMBqnCtrN2uGGuz"
const EVM_ADDRESS = "0x9f0204D1163d8C5c057aAb718a04C00E6C5d5790"
const EVM_ADDRESS_TESTNET = "0x9f0204D1163d8C5c057aAb718a04C00E6C5d5790"

const OPEN_POSITION_FEE_PERCENTAGE = 0.0004 // 0.04%
const ROI_FEE_PERCENTAGE = 0.1 // 10%

export interface SplitAmountResponse {
    feeAmount: BN
    remainingAmount: BN
    feeToAddress: string
}

export interface AttachSuiFeeParams {
    txb?: Transaction
    amount: BN
    tokenId: TokenId
    sourceCoin: CoinArgument
    network: Network
}

export interface AttachSuiRoiFeeParams {
    txb?: Transaction
    amount: BN
    tokenId: TokenId
    sourceCoin: CoinArgument
    network: Network
}

@Injectable()
export class FeeToService {
    constructor(
        private readonly suiCoinManagerService: SuiCoinManagerService,
        private readonly memDbService: MemDbService,
    ) { }

    private splitAmount(
        amount: BN,
        percentage: number,
        platform: PlatformId,
        network: Network
    ): SplitAmountResponse {
        const feeToAddress = this.getFeeToAddress(platform, network)
        // fee = amount * percentage
        const feeAmount = toScaledBN(amount, new Decimal(percentage))
        const remainingAmount = amount.sub(feeAmount)
        return {
            feeAmount,
            remainingAmount,
            feeToAddress,
        }
    }

    public async attachSuiFee(
        {
            txb,
            tokenId,
            amount,
            sourceCoin,
            network,
        }: AttachSuiFeeParams
    ) {
        txb = txb || new Transaction()
        const token = this.memDbService.tokens.find(token => token.displayId === tokenId)
        if (!token) {
            throw new Error("Token not found")
        }
        const { 
            feeAmount, 
            feeToAddress, 
        } = this.splitAmount(amount, OPEN_POSITION_FEE_PERCENTAGE, PlatformId.Sui, network)
        const { spendCoin } = this.suiCoinManagerService.splitCoin({
            txb,
            sourceCoin,
            requiredAmount: feeAmount,
        })
        txb.transferObjects([spendCoin.coinArg], feeToAddress)
    }

    private getFeeToAddress(
        platform: PlatformId, 
        network: Network
    ) {
        switch (platform) {
        case PlatformId.Sui:
            return network === Network.Mainnet ? SUI_ADDRESS : SUI_ADDRESS_TESTNET
        case PlatformId.Solana:
            return network === Network.Mainnet ? SOLANA_ADDRESS : SOLANA_ADDRESS_TESTNET
        case PlatformId.Evm:
            return network === Network.Mainnet ? EVM_ADDRESS : EVM_ADDRESS_TESTNET
        }
    }

    public async attachSuiRoiFee({
        txb,
        amount,
        tokenId,
        network,
        sourceCoin,
    }: AttachSuiRoiFeeParams) {
        txb = txb || new Transaction()
        const token = this.memDbService.tokens.find(token => token.displayId === tokenId)
        if (!token) {
            throw new Error("Token not found")
        }
        // fee = amount * PNL_FEE_PERCENTAGE
        const { 
            feeAmount, 
            feeToAddress, 
        } = this.splitAmount(amount, ROI_FEE_PERCENTAGE, PlatformId.Sui, network)
        const { spendCoin } = this.suiCoinManagerService.splitCoin({
            txb,
            sourceCoin,
            requiredAmount: feeAmount,
        })
        txb.transferObjects([spendCoin.coinArg], feeToAddress)
    }
}