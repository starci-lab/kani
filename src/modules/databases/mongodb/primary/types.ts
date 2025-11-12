export interface PrimaryMongoDbOptions {
    memoryStorage?: {
        manualLoad?: boolean
    } | boolean,
    withSeeders?: {
        manualSeed?: boolean
    } | boolean,
}