import {
    ApiProperty,
    ApiPropertyOptional,
} from "@nestjs/swagger"

/**
 * Base response shape for all REST API endpoints.
 * Use this abstract or IAbstractApiResponse for consistent success/error payloads.
 */
export abstract class AbstractRestResponse<T = unknown> {
    @ApiProperty({
        description: "Whether the request succeeded.",
        example: true,
    })
        success: boolean

    @ApiProperty({
        description:
            "Human-readable message (e.g. success message or error summary).",
        example: "Operation completed successfully",
    })
        message: string

    @ApiPropertyOptional({
        description: "Error code or name when success is false.",
        example: "BadRequestException",
    })
        error?: string

    @ApiPropertyOptional({
        description: "Optional payload returned on success.",
        example: null,
    })
        data?: T
}

/**
 * Interface for typed API response without decorators (e.g. in services).
 */
export interface IAbstractRestResponse<T = undefined> {
    success: boolean
    message: string
    data?: T
    error?: string
}
