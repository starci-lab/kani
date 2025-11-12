import { Seeder } from "nestjs-seeder"

export interface SeedersOptions {
    seeders?: Array<Seeder> | Seeder 
    manualSeed?: boolean
}