import {
    registerEnumType 
} from "@nestjs/graphql"
import {
    createEnumType 
} from "@modules/utils"
import {
    ChainId 
} from "./chain"

/** Identifier for supported blockchain platforms. */
export enum PlatformId {
    Evm = "evm",
    Solana = "solana",
    Sui = "sui",
}

export const GraphQLTypePlatformId = createEnumType(PlatformId)

registerEnumType(GraphQLTypePlatformId,
    {
        name: "PlatformId",
        description: "The platform ID",
        valuesMap: {
            [PlatformId.Evm]: {
                description: "Evm" 
            },
            [PlatformId.Solana]: {
                description: "Solana" 
            },
            [PlatformId.Sui]: {
                description: "Sui" 
            },
        },
    })

/**
 * Converts a chain ID to its corresponding platform ID.
 *
 * @param chainId - The chain ID to convert
 * @returns The corresponding platform ID
 */
export const chainIdToPlatformId = (chainId: ChainId): PlatformId => {
    switch (chainId) {
    case ChainId.Solana:
        return PlatformId.Solana
    case ChainId.Sui:
        return PlatformId.Sui
    }
}
