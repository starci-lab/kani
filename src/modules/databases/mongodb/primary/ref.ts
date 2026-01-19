/**
 * Centralized, stable model-name references for the Primary MongoDB connection.
 *
 * Why: using `SomeSchema.name` inside schema decorators (`ref: ...`) can crash at
 * runtime under circular imports, because the imported class can be `undefined`
 * during module initialization. Using plain strings avoids touching `.name`.
 */
export enum PrimaryMongoDbCollectionRef {
    Bot = "BotSchema",
    User = "UserSchema",
    Executor = "ExecutorSchema",
    AssignedBot = "AssignedBotSchema",
    Session = "SessionSchema",
    Token = "TokenSchema",
    Dex = "DexSchema",
    LiquidityPool = "LiquidityPoolSchema",
    Position = "PositionSchema",
    PositionSettlement = "PositionSettlementSchema",
    Config = "ConfigSchema",
    Transaction = "TransactionSchema",
    State = "StateSchema",
    Job = "JobSchema",
    History = "HistorySchema",
    HistorySerie = "HistorySerieSchema",
    MarketListing = "MarketListingSchema",
    PrivyMetadata = "PrivyMetadataSchema",
    BotActivePosition = "BotActivePositionSchema",
    BalanceSnapshots = "BalanceSnapshotsSchema",
}
