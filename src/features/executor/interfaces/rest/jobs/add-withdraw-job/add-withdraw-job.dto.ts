import {
    AbstractRestResponse, IAbstractRestResponse,
} from "@modules/api"
import {
    ApiProperty,
} from "@nestjs/swagger"
import {
    IsMongoId, IsString, IsNumberString, IsObject,
    IsBoolean,
} from "class-validator"

/** DTO for a single token input in withdraw request. */
export class WithdrawTokenInputDto {
    @IsMongoId()
    @ApiProperty({
        description: "MongoDB ID of the token to withdraw",
        example: "ac95c751a75e2665d5c1faa9",
    })
    @IsString()
        id: string

    @IsNumberString()
    @ApiProperty({
        description: "Amount of the token to withdraw (in smallest unit, e.g. wei, lamports, or token decimals)",
        example: "1000000",
    })
    @IsString()
        amount: string
}

/** DTO for add withdraw job REST request. */
export class AddWithdrawJobRequestDto {
    @IsMongoId()
    @ApiProperty({
        description: "Bot ID to withdraw from",
        example: "ac95c751a75e2665d5c1faa9",
    })
    @IsString()
        id: string
    @ApiProperty({
        description: "List of tokens and corresponding amounts to withdraw",
        type: WithdrawTokenInputDto,
        isArray: true,
    })
    @IsObject()
        tokenInputs: Array<WithdrawTokenInputDto>
    @ApiProperty({
        description: "Whether to withdraw to USDC",
        example: false,
    })
    @IsBoolean()
        toUsdc: boolean
}

/** DTO for add withdraw job REST response. */
export class AddWithdrawJobResponseDto
    extends AbstractRestResponse<undefined>
    implements IAbstractRestResponse {
}
