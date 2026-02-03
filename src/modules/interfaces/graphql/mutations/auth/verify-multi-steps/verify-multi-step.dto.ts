import {
    Field, InputType, ObjectType 
} from "@nestjs/graphql"
import {
    AbstractGraphQLResponse, IAbstractGraphQLResponse 
} from "../../../abstracts"

@InputType({
    description: "Request payload for multi-steps verification.",
})
export class VerifyMultiStepsRequest {
    @Field(() => String,
        {
            description: "The TOTP code to verify.",
        })
        totpCode: string
}

@ObjectType({
    description: "Response data returned after successfully verifying multi-steps authentication.",
})
export class VerifyMultiStepsResponseData {
    @Field(() => Boolean,
        {
            description: "Whether the verification was successful.",
        })
        verified: boolean
}

@ObjectType({
    description: "Response returned after successfully verifying multi-steps authentication.",
})
export class VerifyMultiStepsResponse
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse<VerifyMultiStepsResponseData> {
    @Field(() => VerifyMultiStepsResponseData,
        {
            nullable: true,
            description: "The data returned after successfully verifying multi-steps authentication.",
        })
        data?: VerifyMultiStepsResponseData
}
