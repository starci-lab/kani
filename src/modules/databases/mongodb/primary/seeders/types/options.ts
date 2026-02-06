import type {
    Seeder 
} from "./seeder"

/** Options for seeders module (list of seeders or single, manual seed flag). */
export interface SeedersOptions {
    seeders?: Array<Seeder> | Seeder
    manualSeed?: boolean
}
