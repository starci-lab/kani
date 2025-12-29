/**
 * Dependency Exceptions
 * Errors related to dependency injection and service health
 */

import { AbstractException } from "../abstract"
import { DependencyName } from "@modules/terminus/dependencies/config"

/** Thrown when a required dependency is not found or unhealthy */
export class DependencyNotFoundException extends AbstractException {
    constructor(dependencyName: DependencyName, message?: string) {
        super(message || `Dependency ${dependencyName} not found`, "DEPENDENCY_NOT_FOUND_EXCEPTION", { dependencyName })
    }
}
