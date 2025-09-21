import { LiquidityPoolLike, UserLike } from "@modules/databases"
import { FetchedPool } from "@modules/blockchains"
import { Injectable, NotFoundException } from "@nestjs/common"
import { ChainId, chainIdToPlatform, Network, PlatformId, TokenType } from "@modules/common"
import { DataLikeService } from "./data-like.service"

// this service is used to query the data like service
@Injectable()
export class DataLikeQueryService {
    constructor(private readonly dataLikeService: DataLikeService) { }

    private getWalletOrThrow(userLike: UserLike, platformId: PlatformId) {
        const wallet = userLike.wallets.find(
            (wallet) => wallet.platformId === platformId,
        )
        if (!wallet) {
            throw new NotFoundException(
                `Wallet with type ${platformId} not found for user ${userLike.id ?? ""}`,
            )
        }
        return wallet
    }

    getWallet(userLike: UserLike, platformId: PlatformId) {
        return this.getWalletOrThrow(userLike, platformId)
    }

    getFarmTokenType(
        userLike: UserLike,
        platformId: PlatformId,
        chainId: ChainId,
    ) {
        return this.getWalletOrThrow(userLike, platformId).chainConfigs.find(
            (chainConfig) => chainConfig.chainId === chainId,
        )?.farmTokenType as TokenType
    }

    getPoolsMatchingUserFarmType(
        userLike: UserLike,
        fetchedPools: Array<FetchedPool>,
        platformId: PlatformId,
        chainId: ChainId,
    ) {
        const farmTokenType = this.getFarmTokenType(userLike, platformId, chainId)
        return fetchedPools.filter((pool) =>
            pool.liquidityPool.farmTokenTypes.includes(farmTokenType),
        ) as Array<FetchedPool>
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
        const { liquidityPool, user, chainId, network } = params
        const platformId = chainIdToPlatform(chainId)
        let priorityAOverB = liquidityPool.priorityAOverB ?? false

        if (typeof priorityAOverB === "undefined") {
            const walletFarmTokenType = this.getFarmTokenType(user, platformId, chainId)
            const nativeToken = this.getNative(chainId, network)
            const stableUsdcToken = this.getStableUsdc(chainId, network)

            switch (walletFarmTokenType) {
            case TokenType.StableUsdc:
                priorityAOverB =
                        liquidityPool.tokenAId === stableUsdcToken?.displayId
                break
            case TokenType.Native:
                priorityAOverB =
                        liquidityPool.tokenAId === nativeToken?.displayId
                break
            }
        }

        return priorityAOverB
    }
}

export interface DeterminePriorityAOverBParams {
    liquidityPool: LiquidityPoolLike;
    user: UserLike;
    chainId: ChainId;
    network: Network;
}
