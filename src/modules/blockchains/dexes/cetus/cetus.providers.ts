import { Provider } from "@nestjs/common"
import { initCetusSDK, CetusClmmSDK } from "@cetusprotocol/cetus-sui-clmm-sdk"
import { CETUS_CLMM_SDKS, CETUS_ZAP_SDKS } from "./cetus.constants"
import { ChainId, Network } from "@modules/common"
import { envConfig } from "@modules/env"
import { SUI_CLIENTS } from "../../clients"
import { SuiClient } from "@mysten/sui/client"
import CetusZapSDK from "@cetusprotocol/zap-sdk"
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

export const createCetusZapSdkProvider = (): Provider<
    Record<Network, CetusZapSDK>
> => ({
    provide: CETUS_ZAP_SDKS,
    inject: [SUI_CLIENTS],
    useFactory: (clients: Record<Network, Array<SuiClient>>) => {
        const createClient = (network: Network) => CetusZapSDK.createSDK({
            sui_client: clients[network][0],
        })
        return {
            [Network.Mainnet]: createClient(Network.Mainnet),
            [Network.Testnet]: createClient(Network.Testnet),
        }
    }
})  