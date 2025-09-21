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
    },
})

export enum DexId {
    Cetus = "cetus",
    Turbos = "turbos",
    Momentum = "momentum",
    FlowX = "flowx",
}

export const GraphQLTypeDexId = createEnumType(DexId)

registerEnumType(GraphQLTypeDexId, {
    name: "DexId",
    description: "The name of the dex",
    valuesMap: {
        [DexId.Cetus]: {
            description: "The cetus dex",
        },
        [DexId.Turbos]: {
            description: "The turbos dex",
        },
        [DexId.Momentum]: {
            description: "The momentum finance dex",
        },
        [DexId.FlowX]: {
            description: "The flowx dex",
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
}

export const GraphQLTypeLiquidityPoolId = createEnumType(LiquidityPoolId)

registerEnumType(GraphQLTypeLiquidityPoolId, {
    name: "LiquidityPoolId",
    description: "The name of the lp pool",
    valuesMap: {
        [LiquidityPoolId.CetusSuiIka02]: {
            description: "The cetus sui ika 0.2 lp pool",
        },
        [LiquidityPoolId.CetusSuiUsdc005]: {
            description: "The cetus sui usdc 0.05 lp pool",
        },
        [LiquidityPoolId.CetusUsdcEth025]: {
            description: "The cetus usdc eth 0.25 lp pool",
        },
        [LiquidityPoolId.TurbosIkaUsdc015]: {
            description: "The turbos ika usdc 0.15 lp pool",
        },
        [LiquidityPoolId.TurbosDeepUsdc015]: {
            description: "The turbos sui deep usdc 0.15 lp pool",
        },
        [LiquidityPoolId.MomentumWalSui02]: {
            description: "The momentum wal sui 0.2 lp pool",
        },
        [LiquidityPoolId.MomentumSuiUsdc0175]: {
            description: "The momentum sui usdc 0.175 lp pool",
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
