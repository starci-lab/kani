/** Sui object kind for error reporting. */
export enum ErrorSuiObjectKind {
    Pool = "pool",
    TickUpper = "tickUpper",
    TickLower = "tickLower",
    Position = "position",
    PositionInfo = "positionInfo",
    PositionNFT = "positionNFT",
}

/** Sui operation that requires exactly one prepared transaction. */
export enum ErrorSuiSingleTransactionRequiredOperation {
    OpenPosition = "openPosition",
    ClosePosition = "closePosition",
}
