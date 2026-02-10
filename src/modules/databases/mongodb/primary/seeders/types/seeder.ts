import type {
    ClientSession 
} from "mongoose"

/** Contract for a seeder (seed and drop). */
export interface Seeder {
    seed(session?: ClientSession): Promise<void>
    drop(session?: ClientSession): Promise<void>
}
