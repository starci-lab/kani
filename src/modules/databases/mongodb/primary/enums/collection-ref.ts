/**
 * Centralized, stable model-name references for the Primary MongoDB connection.
 * Using plain strings avoids circular import issues when using `SomeSchema.name` in schema decorators.
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
