// we use this interface to extend the coin object with the amount

import { ObjectRef, TransactionObjectArgument } from "@mysten/sui/transactions"
import BN from "bn.js"

// to ensure the amount is correct
export interface CoinAsset {
    coinObj: TransactionObjectArgument
    coinAmount: BN
    coinRef?: Array<ObjectRef>
}