import { Provider } from "@nestjs/common"
import { AggregatorClient } from "@cetusprotocol/aggregator-sdk"
import { initCetusSDK, CetusClmmSDK } from "@cetusprotocol/cetus-sui-clmm-sdk"
import { CETUS_AGGREGATOR_SDKS, CETUS_CLMM_SDKS } from "./cetus.constants"
import { ChainId, Network } from "@modules/common"
import { envConfig } from "@modules/env"
import { SUI_CLIENTS } from "../../clients"
import { SuiClient } from "@mysten/sui/client"

export const createCetusClmmSdkProvider = (): Provider<Record<Network, CetusClmmSDK>> => ({
    provide: CETUS_CLMM_SDKS,
    useFactory: () => {
        const createClient = (network: Network) => initCetusSDK({
            fullNodeUrl: envConfig().rpcs[ChainId.Sui][network],
            network,
        })
        return {
            [Network.Mainnet]: createClient(Network.Mainnet),
            [Network.Testnet]: createClient(Network.Testnet),
        }
    }
}
)

export const createCetusAggregatorSdkProvider = (): Provider<Record<Network, AggregatorClient>> => ({
    provide: CETUS_AGGREGATOR_SDKS,
    inject: [SUI_CLIENTS],
    useFactory: (clients: Record<Network, SuiClient>) => {
        const createClient = (network: Network) => new AggregatorClient({
            client: clients[network],
        })
        return {
            [Network.Mainnet]: createClient(Network.Mainnet),
            [Network.Testnet]: createClient(Network.Testnet),
        }
    }
})  