import { Injectable } from "@nestjs/common"
import { ActionResponse, ClosePositionParams, IActionService, OpenPositionParams } from "../../interfaces"
import { InjectTurbosClmmSdks } from "./turbos.decorators"
import { Network } from "@modules/common"
import { TurbosSdk } from "turbos-clmm-sdk"

@Injectable()
export class TurbosActionService implements IActionService {
    constructor(
        @InjectTurbosClmmSdks()
        private readonly turbosClmmSdks: Record<Network, TurbosSdk>,
    ) { }

    // open position
    async openPosition({
        pool
    }: OpenPositionParams): Promise<ActionResponse> {
        console.log(pool)
        return {
            txHash: "0x123",
        }
    }

    // close postion
    async closePosition({
        pool,
        position,
        network = Network.Mainnet,
    }: ClosePositionParams): Promise<ActionResponse> {
        console.log(pool, position, network)
        return {
            txHash: "0x123",
        }
    }
}
