import {
    registerEnumType 
} from "@nestjs/graphql"
import {
    createEnumType 
} from "@modules/utils"

export enum Network {
  // mainnet, for production
  Mainnet = "mainnet",
  // testnet, for testing
  Testnet = "testnet",
}

export const GraphQLTypeNetwork = createEnumType(Network)

registerEnumType(GraphQLTypeNetwork,
    {
        name: "Network",
        description: "The network",
        valuesMap: {
            [Network.Mainnet]: {
                description: "Mainnet" 
            },
            [Network.Testnet]: {
                description: "Testnet" 
            },
        },
    })

export enum DexName {
    Cetus = "cetus",
}

export const GraphQLTypeDexName = createEnumType(DexName)

registerEnumType(GraphQLTypeDexName,
    {
        name: "DexName",
        description: "The name of the dex",
        valuesMap: {
            [DexName.Cetus]: {
                description: "Cetus" 
            },
        },
    })
