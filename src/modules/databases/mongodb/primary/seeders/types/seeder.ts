/** Contract for a seeder (seed and drop). */
export interface Seeder {
    seed(): Promise<void>
    drop(): Promise<void>
}
