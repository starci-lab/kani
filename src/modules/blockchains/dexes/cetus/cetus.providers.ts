import { Provider } from "@nestjs/common"
import { initCetusSDK, CetusClmmSDK } from "@cetusprotocol/cetus-sui-clmm-sdk"
import { CETUS_CLMM_SDKS } from "./cetus.constants"
import { ChainId, Network } from "@modules/common"
import { envConfig } from "@modules/env"
import { clientIndex } from "./inner-constants"

export const createCetusClmmSdkProvider = (): Provider<Record<Network, CetusClmmSDK>> => ({
    provide: CETUS_CLMM_SDKS,
    useFactory: () => {
        const createClient = (network: Network) => initCetusSDK({
            // we use default rpc for cetus
            fullNodeUrl: envConfig().rpcs[ChainId.Sui][network][clientIndex],
            network,
        })
        return {
            [Network.Mainnet]: createClient(Network.Mainnet),
            [Network.Testnet]: createClient(Network.Testnet),
        }
    }
}
)