import { AssignedLiquidityPoolLike, ChainConfigLike, LiquidityPoolLike, UserLike } from "@modules/databases"
import { FetchedPool } from "@modules/blockchains"
import { Injectable, NotFoundException } from "@nestjs/common"
import { ChainId, chainIdToPlatform, Network, PlatformId, TokenType } from "@modules/common"
import { DataLikeService } from "./data-like.service"
import { shuffleArray } from "@modules/common"

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
        chainId: ChainId,
        network: Network,
    ) {
        const platformId = chainIdToPlatform(chainId)
        return this.getWalletOrThrow(userLike, platformId).chainConfigs.find(
            (chainConfig) => chainConfig.chainId === chainId && chainConfig.network === network,
        )?.farmTokenType as TokenType
    }

    getAssignedLiquidityPools(
        userLike: UserLike,
        chainId: ChainId,
        network: Network
    ): Array<AssignedLiquidityPoolLike> {
        return userLike
            .wallets
            .flatMap((wallet) => wallet.chainConfigs
                .filter(
                    (chainConfig) =>
                        chainConfig.chainId === chainId && chainConfig.network === network
                )
                .flatMap(
                    (chainConfig) =>
                        chainConfig?.assignedLiquidityPools
                )
            )
            .filter((assignedLiquidityPool) => assignedLiquidityPool !== undefined)
    }

    getChainConfig(
        user: UserLike,
        chainId: ChainId,
        network: Network,
    ): ChainConfigLike {
        const chainConfig = user.wallets.flatMap((wallet) => wallet.chainConfigs).find((chainConfig) => chainConfig.chainId === chainId && chainConfig.network === network)
        if (!chainConfig) {
            throw new NotFoundException(`Chain config not found for user ${user.id ?? ""} on chain ${chainId} and network ${network}`)
        }
        return chainConfig
    }

    getPoolsMatchingUserFarmType(
        user: UserLike,
        fetchedPools: Array<FetchedPool>,
        chainId: ChainId,
        network: Network,
    ) {
        const farmTokenType = this.getFarmTokenType(user, chainId, network)
        const assignedLiquidityPoolIds = this.getAssignedLiquidityPools(user, chainId, network).map(
            (assignedLiquidityPool) =>
                assignedLiquidityPool.liquidityPoolId,
        )
        const unsuffledPools = fetchedPools
            // filter out pools that are already assigned to the user
            .filter((pool) =>
                assignedLiquidityPoolIds.includes(
                    pool.liquidityPool.displayId
                ),
            )
            // filter out pools that do not match the user's farm token type
            .filter((pool) =>
                pool.liquidityPool.farmTokenTypes.includes(farmTokenType),
            ) as Array<FetchedPool>
        return shuffleArray(unsuffledPools)
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

    determinePriorityAOverB(
        {
            liquidityPool,
            user,
            chainId,
            network
        }:
            DeterminePriorityAOverBParams) {
        let priorityAOverB = liquidityPool.priorityAOverB ?? false

        if (typeof priorityAOverB === "undefined") {
            const walletFarmTokenType = this.getFarmTokenType(user, chainId, network)
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
