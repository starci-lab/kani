import {
    AbstractException, AbstractExceptionMetadata
} from "../abstract"

/** Thrown when account limit config is not found */
export type AvatarsConfigNotFoundExceptionMetadata = AbstractExceptionMetadata
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