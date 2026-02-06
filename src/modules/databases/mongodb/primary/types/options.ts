import {
    MemoryStorageOptions 
} from "../memory"
import {
    SeedersOptions 
} from "../seeders"

/** Options for primary MongoDB module. */
export interface PrimaryMongoDbOptions {
    memoryStorage?: MemoryStorageOptions
    withSeeders?: SeedersOptions
    associate?: boolean
}