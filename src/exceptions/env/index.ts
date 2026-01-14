import { AbstractException } from "../abstract"

export class FeatureDisabledInProductionException extends AbstractException {
    constructor(message?: string) {
        super(message || "Feature disabled in production", "FEATURE_DISABLED_IN_PRODUCTION_EXCEPTION")
    }
}