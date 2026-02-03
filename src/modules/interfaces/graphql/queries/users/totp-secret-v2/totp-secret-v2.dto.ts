import {
    ObjectType 
} from "@nestjs/graphql"
import {
    AbstractGraphQLResponse, IAbstractGraphQLResponse 
} from "../../../abstracts"
import {
    Field 
} from "@nestjs/graphql"

@ObjectType({
    description: "The GraphQL response data returned by the totp secret v2 query.",
})
export class TotpSecretV2ResponseData {
    @Field(() => String,
        {
            description: "The TOTP secret, if the request is successful.",
        })
        totpSecret?: string
    @Field(() => String,
        {
            description: "The TOTP secret URL, if the request is successful.",
        })
        totpSecretUrl?: string
}

@ObjectType({
    description: "The GraphQL response object returned by the totp secret v2 query.",
})
export class TotpSecretV2Response
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse<TotpSecretV2ResponseData>
{
    @Field(() => TotpSecretV2ResponseData,
        {
            description: "The TOTP secret, if the request is successful.",
        })
        data?: TotpSecretV2ResponseData
}
