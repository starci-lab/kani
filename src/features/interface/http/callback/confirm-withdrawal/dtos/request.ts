import {
    ApiProperty 
} from "@nestjs/swagger"
import {
    IsMongoId, IsString, IsNumberString, IsArray 
} from "class-validator"

/** DTO for a single received token after withdrawal. */
export class ReceivedTokenDto {
    @IsMongoId()
    @ApiProperty({
        description: "MongoDB ID of the received token",
        example: "ac95c751a75e2665d5c1faa9",
    })
    @IsString()
        id: string

    @IsNumberString()
    @ApiProperty({
        description: "Amount received (in smallest unit)",
        example: "1000000",
    })
    @IsString()
        amount: string
}

/** DTO for confirm withdrawal request. */
export class ConfirmWithdrawalRequestDto {
    /** MongoDB ID of the bot */
    @IsMongoId()
    @ApiProperty({
        description: "MongoDB ID of the bot",
        example: "ac95c751a75e2665d5c1faa9",
    })
    @IsString()
        botId: string

    /** List of transaction hashes to confirm */
    @ApiProperty({
        description: "List of transaction hashes to confirm",
        example: ["0xabc123...",
            "0xdef456..."],
    })
    @IsArray()
    @IsString({
        each: true 
    })
        txHashes: Array<string>

    /** List of tokens received after withdrawal */
    @ApiProperty({
        description: "List of tokens received after withdrawal",
        type: ReceivedTokenDto,
        isArray: true,
    })
    @IsArray()
        receivedTokens: Array<ReceivedTokenDto>
}