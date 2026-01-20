import {
    Seeder 
} from "./seeder.interface"

export interface SeedersOptions {
    seeders?: Array<Seeder> | Seeder 
    manualSeed?: boolean
}