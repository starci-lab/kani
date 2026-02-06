import type {
    AbstractExceptionMetadata 
} from "../abstract"
import {
    AbstractException 
} from "../abstract"
/** Thrown when dependency not found */
export interface DependencyNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    dependencyName: string
}

/** Thrown when healthcheck dependency is not found. */
export class DependencyNotFoundException extends AbstractException {
    constructor(
        { dependencyName }: DependencyNotFoundExceptionMetadata
    ) {
        super("Dependency not found",
            "DEPENDENCY_NOT_FOUND_EXCEPTION",
            {
                dependencyName,
            })
    }
}