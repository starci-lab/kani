import { Field, InputType, ObjectType } from "@nestjs/graphql"
import { AbstractGraphQLResponse, IAbstractGraphQLResponse } from "../../abstract"

@ObjectType({
    description: "Contains the exported wallet keypair, used for backup or manual storage.",
})
export class ExportedAccountResponseData {
  @Field(() => String, {
      description: "The wallet's account address, derived from the public key.",
  })
      accountAddress: string

  @Field(() => String, {
      description:
      "The wallet's private key. This is highly sensitive — anyone with this key has full control of the wallet. Do not log, cache, or share this value.",
  })
      privateKey: string
}

@ObjectType({
    description: "The GraphQL response object returned by the getExportedAccount query.",
})
export class ExportedAccountResponse
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse<ExportedAccountResponseData>
{
  @Field(() => ExportedAccountResponseData, {
      nullable: true,
      description: "The exported wallet keypair data, if the request is successful.",
  })
      data?: ExportedAccountResponseData
}

@InputType({
    description: "Input fields required to fetch an exported wallet keypair.",
})
export class ExportedAccountRequest {
  @Field(() => String, {
      description: "The unique ID of the liquidity provision bot associated with the account.",
  })
      id: string
}