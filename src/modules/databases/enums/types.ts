import { registerEnumType } from "@nestjs/graphql"
import { createEnumType } from "@modules/common"

export enum OauthProviderName {
    Google = "google",
    Facebook = "facebook",
    X = "x"
}

export const GraphQLTypeOauthProviderName = createEnumType(OauthProviderName)

registerEnumType(GraphQLTypeOauthProviderName, {
    name: "OauthProviderName",
    description: "The name of the oauth provider",
    valuesMap: {
        [OauthProviderName.Google]: {
            description: "The google oauth provider"
        },
        [OauthProviderName.Facebook]: {
            description: "The facebook oauth provider"
        },
        [OauthProviderName.X]: {
            description: "The x oauth provider"
        }
    }
})

export enum WalletType {
    Sui = "sui",
    Evm = "evm",
    Solana = "solana",
}
export const GraphQLTypeWalletType = createEnumType(WalletType)

registerEnumType(GraphQLTypeWalletType, {
    name: "WalletType",
    description: "The type of the wallet",
    valuesMap: {
        [WalletType.Sui]: {
            description: "The sui wallet"
        },
        [WalletType.Evm]: {
            description: "The evm wallet"
        },
        [WalletType.Solana]: {
            description: "The solana wallet"
        }
    }
})
