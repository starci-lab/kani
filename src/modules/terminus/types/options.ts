import type {
    DependencyName
} from "../dependencies/config"

/** Terminus module options (dependencies to check). */
export interface TerminusOptions {
    dependencies: Array<DependencyName>
}
