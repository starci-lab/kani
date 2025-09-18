
import { BaseModuleOptions } from "@modules/common"
import { DexId } from "@modules/databases"
import { Transaction, TransactionObjectArgument } from "@mysten/sui/transactions"
import BN from "bn.js"

export interface DexesOptions extends BaseModuleOptions {
    dexes?: Array<DexId>
    useGcpKms?: boolean
}

export interface ActionResponse {
    // tx hash returned if the tx is excuted
    txHash?: string
    // txb (sui only), in order to connect to the tx
    txb?: Transaction
    extraObj?: unknown
}

// we use this interface to extend the coin object with the amount
// to ensure the amount is correct
export interface ExtendedCoinObj {
    coinObj: TransactionObjectArgument
    coinAmount: BN
}
