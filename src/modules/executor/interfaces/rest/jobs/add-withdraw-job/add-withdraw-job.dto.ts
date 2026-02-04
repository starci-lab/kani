import {
    AbstractRestResponse, IAbstractRestResponse,
} from "@modules/api"
import {
    ApiProperty,
} from "@nestjs/swagger"
import {
    IsMongoId, IsString, IsNumberString, IsObject,
} from "class-validator"

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

export class AddWithdrawJobRequestDto {
    @ApiProperty({
        description: "List of tokens and corresponding amounts to withdraw",
        type: WithdrawTokenInputDto,
        isArray: true,
    })
    @IsObject()
        tokenInputs: Array<WithdrawTokenInputDto>
}

export class AddWithdrawJobResponseDataDto {
    @ApiProperty({
        description: "The ID of the job that was created",
        example: "ac95c751a75e2665d5c1faa9",
    })
    @IsString()
        jobId: string
}

export class AddWithdrawJobResponseDto
    extends AbstractRestResponse<AddWithdrawJobResponseDataDto>
    implements IAbstractRestResponse<AddWithdrawJobResponseDataDto> {
}
