import {
    registerEnumType
} from "@nestjs/graphql"
import {
    createEnumType
} from "../utils/enum"

/** Type classification for tokens. */
export enum TokenType {
    Native = "native",
    StableCoin = "stableCoin",
    Wrapper = "wrapper",
    Regular = "regular",
    LiquidStaking = "liquidStaking",
}

export const GraphQLTypeTokenType = createEnumType(TokenType)

registerEnumType(GraphQLTypeTokenType,
    {
        name: "TokenType",
        description: "The token type",
        valuesMap: {
            [TokenType.Native]: {
                description: "The token is native",
            },
            [TokenType.StableCoin]: {
                description: "The token is stable coin",
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
