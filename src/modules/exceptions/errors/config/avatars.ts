import type {
    AbstractExceptionMetadata 
} from "../abstract"
import {
    AbstractException 
} from "../abstract"

/** Metadata when avatars config is not found. */
export type AvatarsConfigNotFoundExceptionMetadata = AbstractExceptionMetadata

/** Thrown when avatars config is not found. */
export class AvatarsConfigNotFoundException extends AbstractException {
    constructor(
        { originalError }: AvatarsConfigNotFoundExceptionMetadata
    ) {
        super(
            "Avatars config not found",
            "AVATARS_CONFIG_NOT_FOUND_EXCEPTION",
            {
                originalError,
            }
        )
    }
}