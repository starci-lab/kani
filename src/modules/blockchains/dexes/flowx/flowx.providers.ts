/* eslint-disable @typescript-eslint/no-explicit-any */
import { Provider } from "@nestjs/common"
import { FLOWX_CLMM_SDKS } from "./flowx.constants"
import { Network } from "@modules/common"
import { ClmmPoolManager, ClmmPositionManager } from "@flowx-finance/sdk"
import { SuiClient } from "@mysten/sui/client"
import { SUI_CLIENTS } from "@modules/blockchains/clients"
import { clientIndex } from "./inner-constants"

export interface FlowXClmmSdk {
    poolManager: ClmmPoolManager
    positionManager: ClmmPositionManager
}
export const createFlowXClmmSdkProvider = (): Provider<
    Record<Network, FlowXClmmSdk>
> => ({
    provide: FLOWX_CLMM_SDKS,
    inject: [SUI_CLIENTS],
    useFactory: (
        clients: Record<Network, Array<SuiClient>>
    ) => {
        const createClient = (network: Network) => {
            const client = clients[network][clientIndex]
            const flowxNetwork = network === Network.Mainnet ? "mainnet" : "testnet"
            // Initialize FlowX SDK
            const poolManager = new ClmmPoolManager(flowxNetwork)
                .suiClient(
                client as any
                ) // FlowX uses clientIndex 3
            // Create position manager
            const positionManager = new ClmmPositionManager(flowxNetwork, poolManager)
                .suiClient(
                    client as any
                )
            return {
                poolManager,
                positionManager
            }
        }
        return {
            [Network.Mainnet]: createClient(Network.Mainnet),
            [Network.Testnet]: createClient(Network.Testnet),
        }
    },
})
