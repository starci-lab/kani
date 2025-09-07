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
}

export const GraphQLTypeDexId = createEnumType(DexId)

registerEnumType(GraphQLTypeDexId, {
    name: "DexId",
    description: "The name of the dex",
    valuesMap: {
        [DexId.Cetus]: {
            description: "The cetus dex",
        },
    },
})

export enum LiquidityPoolId {
    CetusSuiIka02 = "cetusSuiIka02",
    CetusSuiUsdc005 = "cetusSuiUsdc005",  
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
    },
})