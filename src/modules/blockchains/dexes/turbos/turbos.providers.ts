import { Provider } from "@nestjs/common"
import { TURBOS_CLMM_SDKS } from "./turbos.constants"
import { ChainId, Network } from "@modules/common"
import { envConfig } from "@modules/env"
import { Network as TurbosNetwork, TurbosSdk } from "turbos-clmm-sdk"
import { clientIndex } from "./inner-constants"

export const createTurbosClmmSdkProvider = (): Provider<
  Record<Network, TurbosSdk>
> => ({
    provide: TURBOS_CLMM_SDKS,
    useFactory: () => {
        const createClient = (network: Network) => {
            const turbosNetwork =
        network === Network.Mainnet
            ? TurbosNetwork.mainnet
            : TurbosNetwork.testnet
            return new TurbosSdk(turbosNetwork, {
                network: turbosNetwork,
                // we use zan for turbos
                url: envConfig().rpcs[ChainId.Sui][network][clientIndex],
            })
        }
        return {
            [Network.Mainnet]: createClient(Network.Mainnet),
            [Network.Testnet]: createClient(Network.Testnet),
        }
    },
})
