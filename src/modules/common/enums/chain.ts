import {
    registerEnumType
} from "@nestjs/graphql"
import {
    createEnumType
} from "../utils/enum"

/** Identifier for supported blockchain networks. */
export enum ChainId {
    Solana = "solana",
    Sui = "sui",
}

export const GraphQLTypeChainId = createEnumType(ChainId)

registerEnumType(GraphQLTypeChainId,
    {
        name: "ChainId",
        description: "The chain ID",
        valuesMap: {
            [ChainId.Solana]: {
                description: "The chain is solana",
            },
            [ChainId.Sui]: {
                description: "The chain is sui",
            },
        },
    })
