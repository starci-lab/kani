import {
    ApiPropertyOptional,
} from "@nestjs/swagger"

/**
 * Response shape returned by RestTransformInterceptor.
 * Documented for Swagger so all controller responses show success/message/data/error.
 */
export class RestTransformResponseDto<T = unknown> {
    @ApiPropertyOptional({
        description: "Response payload when the request succeeded.",
        example: {
            id: "123", status: "created" 
        },
    })
        data?: T

    @ApiPropertyOptional({
        description: "Success or status message.",
        example: "Resource created successfully",
    })
        message?: string

    @ApiPropertyOptional({
        description: "True when the request succeeded, false on exception.",
        example: true,
    })
        success?: boolean

    @ApiPropertyOptional({
        description: "Error name or code when success is false.",
        example: "ValidationError",
    })
        error?: string
}
