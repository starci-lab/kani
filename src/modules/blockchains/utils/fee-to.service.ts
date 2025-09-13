import { Network, PlatformId } from "@modules/common"
import { Transaction } from "@mysten/sui/transactions"
import { Injectable } from "@nestjs/common"
import BN from "bn.js"
import { SuiCoinManagerService } from "./sui-coin-manager.service"
import { InjectSuiClients } from "../clients"
import { SuiClient } from "@mysten/sui/client"

const SUI_ADDRESS = "0x99c8f234bc7b483ce7a00176b8294805388c165b5c3d6eae909ab333ff601030"
const SUI_ADDRESS_TESTNET = "0x99c8f234bc7b483ce7a00176b8294805388c165b5c3d6eae909ab333ff601030"
const SOLANA_ADDRESS = "BhCsZy478Q7EYeubZ7uxuWmHabBJAdMBqnCtrN2uGGuz"
const SOLANA_ADDRESS_TESTNET = "BhCsZy478Q7EYeubZ7uxuWmHabBJAdMBqnCtrN2uGGuz"
const EVM_ADDRESS = "0x9f0204D1163d8C5c057aAb718a04C00E6C5d5790"
const EVM_ADDRESS_TESTNET = "0x9f0204D1163d8C5c057aAb718a04C00E6C5d5790"

const OPEN_POSITION_FEE_PERCENTAGE = 0.0004 // 0.04%

export interface SplitAmountResponse {
    feeAmount: BN
    remainingAmount: BN
    feeToAddress: string
}

export interface AttachSuiFeeParams {
    txb?: Transaction
    amount: BN
    tokenAddress: string
    accountAddress: string
    network: Network
}

export interface AttachSuiFeeResponse {
    txb: Transaction
    remainingAmount: BN
}

@Injectable()
export class FeeToService {
    constructor(
        private readonly suiCoinManagerService: SuiCoinManagerService,
        @InjectSuiClients()
        private readonly suiClients: Record<Network, Array<SuiClient>>,
    ) { }

    private splitAmount(
        amount: BN,
        platform: PlatformId,
        network: Network
    ): SplitAmountResponse {
        const feeToAddress = this.getFeeToAddress(platform, network)

        // fee = amount * percentage
        const feeAmount = amount.mul(
            new BN(Math.floor(OPEN_POSITION_FEE_PERCENTAGE * 1e9))
        ).div(new BN(1e9))

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
            tokenAddress,
            accountAddress,
            network,
            amount
        }: AttachSuiFeeParams
    ): Promise<AttachSuiFeeResponse> {
        txb = txb || new Transaction()
        const { feeAmount, 
            feeToAddress, 
            remainingAmount
        } = this.splitAmount(amount, PlatformId.Sui, network)
        const suiClient = this.suiClients[network][0]
        const feeToCoin = await this.suiCoinManagerService.consolidateCoins({
            txb,
            suiClient,
            owner: accountAddress,
            coinType: tokenAddress,
            requiredAmount: feeAmount,
        })
        if (!feeToCoin) {
            throw new Error("Fee to coin is required")
        }
        txb.transferObjects([feeToCoin], feeToAddress)
        return {
            txb,
            remainingAmount,
        }
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
}