import { registerEnumType } from "@nestjs/graphql"
import { createEnumType } from "../utils"

export enum ChainId {
  // Solana
  Solana = "solana",
  // Monad
  Monad = "monad",
  // BSC
  Bsc = "bsc",
  // Sui
  Sui = "sui",
}

export const GraphQLTypeChainId = createEnumType(ChainId)

registerEnumType(GraphQLTypeChainId, {
    name: "ChainId",
    description: "The chain ID",
    valuesMap: {
        [ChainId.Solana]: {
            description: "The chain is solana",
        },
        [ChainId.Monad]: {
            description: "The chain is monad",
        },
        [ChainId.Bsc]: {
            description: "The chain is bsc",
        },
        [ChainId.Sui]: {
            description: "The chain is sui",
        },
    },
})

export enum PlatformId {
  Evm = "evm",
  Solana = "solana",
  Sui = "sui",
}

export const GraphQLTypePlatformId = createEnumType(PlatformId)

registerEnumType(GraphQLTypePlatformId, {
    name: "PlatformId",
    description: "The platform ID",
    valuesMap: {
        [PlatformId.Evm]: { description: "Evm" },
        [PlatformId.Solana]: { description: "Solana" },
        [PlatformId.Sui]: { description: "Sui" },
    },
})

export const chainIdToPlatformId = (chainId: ChainId): PlatformId => {
    switch (chainId) {
    case ChainId.Solana:
        return PlatformId.Solana
    case ChainId.Monad:
        return PlatformId.Evm
    case ChainId.Bsc:
        return PlatformId.Evm
    case ChainId.Sui:
        return PlatformId.Sui
    }
}

export enum TokenType {
  // native token
  Native = "native",
  // stable token
  StableUsdc = "stableUsdc",
  // wrapper token
  Wrapper = "wrapper",
  // non-native token
  Regular = "regular",
  // liquid staking token
  LiquidStaking = "liquidStaking",
}

export const GraphQLTypeTokenType = createEnumType(TokenType)

registerEnumType(GraphQLTypeTokenType, {
    name: "TokenType",
    description: "The token type",
    valuesMap: {
        [TokenType.Native]: {
            description: "The token is native",
        },
        [TokenType.StableUsdc]: {
            description: "The token is stable",
        },
        [TokenType.Wrapper]: {
            description: "The token is wrapper",
        },
        [TokenType.Regular]: {
            description: "The token is regular",
        },
        [TokenType.LiquidStaking]: {
            description: "The token is liquid staking",
        },
    },
})

export enum Network {
  // mainnet, for production
  Mainnet = "mainnet",
  // testnet, for testing
  Testnet = "testnet",
}

export const GraphQLTypeNetwork = createEnumType(Network)

registerEnumType(GraphQLTypeNetwork, {
    name: "Network",
    description: "The network",
    valuesMap: {
        [Network.Mainnet]: { description: "Mainnet" },
        [Network.Testnet]: { description: "Testnet" },
    },
})

export enum DexName {
    Cetus = "cetus",
}

export const GraphQLTypeDexName = createEnumType(DexName)

registerEnumType(GraphQLTypeDexName, {
    name: "DexName",
    description: "The name of the dex",
    valuesMap: {
        [DexName.Cetus]: { description: "Cetus" },
    },
})