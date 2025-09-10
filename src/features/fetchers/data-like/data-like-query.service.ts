import { FarmType, UserLike, WalletType } from "@modules/databases"
import { FetchedPool } from "@modules/blockchains"
import { Injectable, NotFoundException } from "@nestjs/common"
import { ChainId, Network, TokenType } from "@modules/common"
import { DataLikeService } from "./data-like.service"

// this service is used to query the data like service
@Injectable()
export class DataLikeQueryService {
    constructor(
        private readonly dataLikeService: DataLikeService,
    ) {}

    private getWalletOrThrow(userLike: UserLike, walletType: WalletType) {
        const wallet = userLike.wallets.find((w) => w.type === walletType)
        if (!wallet) {
            throw new NotFoundException(
                `Wallet with type ${walletType} not found for user ${userLike.id ?? ""}`,
            )
        }
        return wallet
    }

    getWallet(userLike: UserLike, walletType: WalletType) {
        return this.getWalletOrThrow(userLike, walletType)
    }

    getFarmType(userLike: UserLike, walletType: WalletType) {
        return this.getWalletOrThrow(userLike, walletType).farmType
    }

    getPoolsMatchingUserFarmType(
        userLike: UserLike,
        fetchedPools: Array<FetchedPool>,
        walletType: WalletType,
    ) {
        const farmType = this.getFarmType(userLike, walletType)
        return fetchedPools.filter((pool) =>
            pool.liquidityPool.farmTypes.includes(farmType),
        )
    }

    getNative(chainId: ChainId, network: Network) {
        const tokens = this.dataLikeService.tokens
        return tokens.find(
            (token) =>
                token.type === TokenType.Native &&
        token.chainId === chainId &&
        token.network === network,
        )
    }

    getStableUsdc(chainId: ChainId, network: Network) {
        const tokens = this.dataLikeService.tokens
        return tokens.find(
            (token) =>
                token.type === TokenType.StableUsdc &&
        token.chainId === chainId &&
        token.network === network,
        )
    }
    
    determinePriorityAOverB(params: DeterminePriorityAOverBParams) {
        const {
            pool,
            user,
            walletType,
            chainId,
            network,
        } = params
    
        let priorityAOverB = pool.liquidityPool.priorityAOverB
    
        if (typeof priorityAOverB === "undefined") {
            const wallet = this.getWallet(user, walletType)
            const walletFarmType = wallet.farmType
            const nativeToken = this.getNative(chainId, network)
            const stableUsdcToken = this.getStableUsdc(chainId, network)
    
            switch (walletFarmType) {
            case FarmType.Usdc:
                priorityAOverB = pool.liquidityPool.tokenAId === stableUsdcToken?.displayId
                break
            case FarmType.Native:
                priorityAOverB = pool.liquidityPool.tokenAId === nativeToken?.displayId
                break
            }
        }
    
        return priorityAOverB
    }
}

export interface DeterminePriorityAOverBParams {
    pool: FetchedPool
    user: UserLike
    walletType: WalletType
    chainId: ChainId
    network: Network
}