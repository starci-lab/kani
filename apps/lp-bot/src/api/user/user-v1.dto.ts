import { PlatformId } from "@modules/common"
import { Field, ObjectType } from "@nestjs/graphql"
import { ApiProperty } from "@nestjs/swagger"

@ObjectType({ 
    description: "Represents a user wallet across multiple chains"
})
export class UserWalletResponseDto {
    @ApiProperty({
        description: "User wallet account address (format depends on chain)",
        example: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e", // Ethereum address
    })
    @Field(() => String)
        accountAddress: string

    @ApiProperty({
        description: "User wallet private key (format depends on chain). Do NOT expose in public API",
        example: "0x4c0883a69102937d6231471b5dbb6204fe512961708279a3c0...",
    })
    @Field(() => String)
        privateKey: string
}

// since get request only has path params, we need to define the params here
export class UserWalletParams {
    platformId?: PlatformId
}