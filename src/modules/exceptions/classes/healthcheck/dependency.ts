import {
    AbstractException,
    AbstractExceptionMetadata,
} from "../abstract"
/** Thrown when dependency not found */
export interface DependencyNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    dependencyName: string
}
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