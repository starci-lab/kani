import { ChainId, Network } from "@modules/common"
import { CexId, DexId, LiquidityPoolId, TokenId } from "../enums"

export interface BaseLike {
    id?: string
    createdAt?: Date
    updatedAt?: Date
}

export interface TokenLike extends BaseLike {
    /** Display ID for the token */
    displayId: TokenId

    /** Name of the token */
    name: string

    /** Token symbol (e.g. SUI, IKA, USDC) */
    symbol: string

    /** Number of decimals used for the token */
    decimals: number

    /** Contract address of the token on its chain */
    tokenAddress: string

    /** CoinMarketCap ID of the token (e.g. 'sui', 'solana', 'bitcoin') */
    coinMarketCapId: string

    /** CoinGecko ID of the token (e.g. 'sui', 'solana', 'bitcoin') */
    coinGeckoId: string

    /** URL of the token icon */
    iconUrl: string

    /** Blockchain chain ID where this token is deployed */
    chainId: ChainId

    /** URL of the token project */
    projectUrl: string

    /** Network where this token is deployed */
    network: Network

    /** Which Cex the token is listed */
    cexIds: Array<CexId>
}

export interface DexLike extends BaseLike {
    /** Unique identifier of the DEX */
    displayId: DexId

    /** Human-readable name of the DEX (e.g., Uniswap, Cetus) */
    name: string

    /** Short description about the DEX */
    description?: string

    /** Official website URL of the DEX */
    website?: string

    /** Icon URL for branding/logo */
    iconUrl?: string
}

export interface LiquidityPoolLike extends BaseLike {
    /** Unique display identifier for the pool */
    displayId: LiquidityPoolId

    /** Reference to the DEX this pool belongs to */
    dexId: DexId
    dex?: DexLike

    /** Pool address on-chain */
    poolAddress: string

    /** First token in the pool */
    tokenAId: TokenId
    tokenA?: TokenLike

    /** Second token in the pool */
    tokenBId: TokenId
    tokenB?: TokenLike

    /** Pool trading fee percentage */
    fee: number

    /** Network where this pool exists */
    network: Network

    /** Chain ID where this pool exists */
    chainId: ChainId
}

export interface UserDepositLike extends BaseLike {
    /** Deposit amount */
    depositAmount: number
}

export interface UserCummulativeLike extends BaseLike {
    /** Total cumulative capital the user has allocated */
    cumulativeCapital: number

    /** Current profit or loss in absolute value */
    pnl: number

    /** Return on investment (ROI) percentage */
    roi: number
}

export interface UserWalletLike extends BaseLike {
    /** Account address of the wallet */
    accountAddress: string
    /** Encrypted private key of the wallet */
    encryptedPrivateKey: string
}

export interface AssignedLiquidityPoolLike extends BaseLike {
    /** The liquidity pool that the user is assigned to */
    poolId: string
    pool?: LiquidityPoolLike
}

export interface UserAllocationLike extends BaseLike {
    /** The user who allocated capital */
    userId: string

    /** List of all deposit transactions this user has made */
    deposits: Array<UserDepositLike>

    /** The cumulative capital and PnL of the user */
    cummulatives: Array<UserCummulativeLike>

    /** The token that the user has prioritized */
    priorityTokenId: TokenId
    priorityToken?: TokenLike

    /** Whether the user wants to auto-exit to USDC when dump is triggered */
    exitToUsdc: boolean

    /** The Sui wallet linked to this allocation */
    suiWallet?: UserWalletLike

    /** The EVM-compatible wallet (Ethereum, BSC, etc.) linked to this allocation */
    evmWallet?: UserWalletLike

    /** The Solana wallet linked to this allocation */
    solanaWallet?: UserWalletLike

    /** The pools that the user is assigned to */
    assignedSuiPools: Array<AssignedLiquidityPoolLike>
    assignedSolanaPools: Array<AssignedLiquidityPoolLike>
}