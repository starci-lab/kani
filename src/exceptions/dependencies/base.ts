import { DependencyName } from "@modules/terminus/dependencies/config"
import { AbstractException } from "../abstract"

export class DependencyNotFoundException extends AbstractException {
    constructor(dependencyName: DependencyName, message?: string) {
        super(message || `Dependency ${dependencyName} not found`, "DEPENDENCY_NOT_FOUND_EXCEPTION",  {
            dependencyName,
        })
    }
}