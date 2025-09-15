import { Provider } from "@nestjs/common"
import { MOMENTUM_CLMM_SDKS } from "./momentum.constants"
import { Network } from "@modules/common"
import { MmtSDK } from "@mmt-finance/clmm-sdk"
import { SuiClient } from "@mysten/sui/client"

export const createMomentumClmmSdkProvider = (): Provider<
    Record<Network, MmtSDK>
> => ({
    provide: MOMENTUM_CLMM_SDKS,
    useFactory: (
        clients: Record<Network, Array<SuiClient>>
    ) => {
        const createClient = (network: Network) => {
            const momentumNetwork = network === Network.Mainnet ? "mainnet" : "testnet"
            return MmtSDK.NEW({
                network: momentumNetwork,
                client: clients[2]
            })
        }
        return {
            [Network.Mainnet]: createClient(Network.Mainnet),
            [Network.Testnet]: createClient(Network.Testnet),
        }
    },
})
