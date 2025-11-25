import { createEnumType } from "@modules/common"
import { registerEnumType } from "@nestjs/graphql"

export enum TokenId {
    // --- Sui ---
    SuiUsdc = "suiUsdc",
    SuiIka = "suiIka",
    SuiNative = "suiNative",
    SuiWalrus = "suiWalrus",
    SuiCetus = "suiCetus",
    SuiAlkimi = "suiAlkimi",
    SuiDeep = "suiDeep",
    SuiEth = "suiEth",
    SuiXStakedSui = "suiXStakedSui",

    // --- Solana ---
    SolUsdc = "solUsdc",
    SolNative = "solNative",
    SolMsol = "solMsol",
    SolRay = "solRay",
    SolOrca = "solOrca",
    SolUsdt = "solUsdt",
}

export const GraphQLTypeTokenId = createEnumType(TokenId)

registerEnumType(GraphQLTypeTokenId, {
    name: "TokenId",
    description: "Supported token identifiers on Sui and Solana blockchains.",
    valuesMap: {
        // --- Sui ---
        [TokenId.SuiUsdc]: {
            description: "USD Coin stablecoin (USDC) on Sui.",
        },
        [TokenId.SuiIka]: {
            description: "IKA token on Sui.",
        },
        [TokenId.SuiNative]: {
            description: "Native SUI token.",
        },
        [TokenId.SuiWalrus]: {
            description: "Walrus token on Sui.",
        },
        [TokenId.SuiCetus]: {
            description: "Cetus token on Sui.",
        },
        [TokenId.SuiAlkimi]: {
            description: "Alkimi token on Sui.",
        },
        [TokenId.SuiDeep]: {
            description: "Deep token on Sui.",
        },
        [TokenId.SuiEth]: {
            description: "ETH token on Sui.",
        },
        [TokenId.SuiXStakedSui]: {
            description: "X Staked SUI token on Sui.",
        },
        // --- Solana ---
        [TokenId.SolUsdc]: {
            description: "USD Coin stablecoin (USDC) on Solana.",
        },
        [TokenId.SolNative]: {
            description: "Native SOL token.",
        },
        [TokenId.SolMsol]: {
            description: "Marinade staked SOL (mSOL).",
        },
        [TokenId.SolRay]: {
            description: "Raydium (RAY) token.",
        },
        [TokenId.SolOrca]: {
            description: "Orca (ORCA) token.",
        },
        [TokenId.SolUsdt]: {
            description: "USD Tether stablecoin (USDT) on Solana.",
        },
    },
})

export enum DexId {
    Cetus = "cetus",
    Turbos = "turbos",
    Momentum = "momentum",
    FlowX = "flowx",
    Raydium = "raydium",
    Orca = "orca",
    Meteora = "meteora",
    Saros = "saros",
}

export const GraphQLTypeDexId = createEnumType(DexId)

registerEnumType(GraphQLTypeDexId, {
    name: "DexId",
    description: "Identifier for supported decentralized exchanges (DEXs).",
    valuesMap: {
        [DexId.Cetus]: {
            description: "Cetus DEX - a Solana-based automated market maker for fast swaps."
        },
        [DexId.Turbos]: {
            description: "Turbos DEX - a high-performance trading platform for SPL tokens."
        },
        [DexId.Momentum]: {
            description: "Momentum Finance DEX - focuses on liquidity and yield farming strategies."
        },
        [DexId.FlowX]: {
            description: "FlowX DEX - optimized for low-latency swaps and high throughput."
        },
        [DexId.Raydium]: {
            description: "Raydium DEX - integrates AMM with Serum orderbook for efficient trading."
        },
        [DexId.Orca]: {
            description: "Orca DEX - user-friendly AMM on Solana with low fees."
        },
        [DexId.Meteora]: {
            description: "Meteora DEX - advanced trading features for professional users."
        },
        [DexId.Saros]: {
            description: "Saros DEX - optimized liquidity pools and yield farming opportunities."
        },
    },
})

export enum LiquidityPoolId {
    CetusSuiIka02 = "cetusSuiIka02",
    CetusSuiUsdc005 = "cetusSuiUsdc005",  
    CetusUsdcEth025 = "cetusUsdcEth025",
    TurbosIkaUsdc015 = "turbosIkaUsdc015",
    TurbosDeepUsdc015 = "turbosDeepUsdc015",
    MomentumWalSui02 = "momentumWalSui02",
    MomentumSuiUsdc0175 = "momentumSuiUsdc0175",
    RaydiumSolUsdc004 = "raydiumSolUsdc004",
    RaydiumSolUsdt001 = "raydiumSolUsdt001",
    OrcaSolUsdc004 = "orcaSolUsdc004"
}

export const GraphQLTypeLiquidityPoolId = createEnumType(LiquidityPoolId)

registerEnumType(GraphQLTypeLiquidityPoolId, {
    name: "LiquidityPoolId",
    description: "Identifiers for supported liquidity pools across various platforms.",
    valuesMap: {
        [LiquidityPoolId.CetusSuiIka02]: {
            description: "Cetus SUI-IKA LP pool with a 0.2% fee tier.",
        },
        [LiquidityPoolId.CetusSuiUsdc005]: {
            description: "Cetus SUI-USDC LP pool with a 0.05% fee tier.",
        },
        [LiquidityPoolId.CetusUsdcEth025]: {
            description: "Cetus USDC-ETH LP pool with a 0.25% fee tier.",
        },
        [LiquidityPoolId.TurbosIkaUsdc015]: {
            description: "Turbos IKA-USDC LP pool with a 0.15% fee tier.",
        },
        [LiquidityPoolId.TurbosDeepUsdc015]: {
            description: "Turbos DEEP-USDC LP pool with a 0.15% fee tier.",
        },
        [LiquidityPoolId.MomentumWalSui02]: {
            description: "Momentum WAL-SUI LP pool with a 0.2% fee tier.",
        },
        [LiquidityPoolId.MomentumSuiUsdc0175]: {
            description: "Momentum SUI-USDC LP pool with a 0.175% fee tier.",
        },
        [LiquidityPoolId.RaydiumSolUsdc004]: {
            description: "Raydium SOL-USDC LP pool with a 0.04% fee tier.",
        },
        [LiquidityPoolId.RaydiumSolUsdt001]: {
            description: "Raydium SOL-USDT LP pool with a 0.01% fee tier.",
        },
        [LiquidityPoolId.OrcaSolUsdc004]: {
            description: "Orca SOL-USDC LP pool with a 0.04% fee tier.",
        },
    },
})

export enum CexId {
    Binance = "binance",
    Gate = "gate",
    Bybit = "bybit"
}
export const GraphQLTypeCexId = createEnumType(CexId)

registerEnumType(GraphQLTypeCexId, {
    name: "CexId",
    description: "The name of the cex",
    valuesMap: {
        [CexId.Binance]: {
            description: "The binance cex",
        },
        [CexId.Gate]: {
            description: "The gate cex",
        },
        [CexId.Bybit]: {
            description: "The bybit cex",
        },
    },
})

export enum ConfigId {
    Gas = "gas",
    Fee = "fee",
    Fund = "fund",
}

export const GraphQLTypeConfigId = createEnumType(ConfigId)

registerEnumType(GraphQLTypeConfigId, {
    name: "ConfigId",
    description: "The id of the config",
    valuesMap: {
        [ConfigId.Gas]: {
            description: "The gas config",
        },
        [ConfigId.Fee]: {
            description: "The fee config",
        },
        [ConfigId.Fund]: {
            description: "The fund config",
        },
    },
})

export enum ExplorerId {
    // SUI
    SuiVision = "suiVision",
    SuiScan = "suiScan",
    // SOLANA
    Solscan = "solscan",
    SolanaFM = "solanaFm",
    SolanaExplorer = "solanaExplorer",
}

export const GraphQLTypeExplorerId = createEnumType(ExplorerId)

registerEnumType(GraphQLTypeExplorerId, {
    name: "ExplorerId",
    description: "The name of the explorer",
    valuesMap: {
        [ExplorerId.SuiVision]: {
            description: "The sui vision explorer",
        },
        [ExplorerId.SuiScan]: {
            description: "The sui scan explorer",
        },
        [ExplorerId.Solscan]: {
            description: "The solscan explorer",
        },
        [ExplorerId.SolanaFM]: {
            description: "The solana fm explorer",
        },
        [ExplorerId.SolanaExplorer]: {
            description: "The solana explorer",
        },
    },
})
