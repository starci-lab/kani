/** Solana account kind for error/context reporting (fetch account, etc.). */
export enum AccountKind {
    Pool = "pool",
    TickArrayLower = "tickArrayLower",
    TickArrayUpper = "tickArrayUpper",
    PositionATA = "positionATA",
    DLMMPosition = "dlmmPosition",
    PersonalPosition = "personalPosition",
    BinArray = "binArray",
}
