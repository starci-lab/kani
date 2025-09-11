import { Network } from "@modules/common"
import { Provider } from "@nestjs/common"
import { AggregatorClient} from "@cetusprotocol/aggregator-sdk"
import { CETUS_AGGRGATOR_SDKS, SEVEN_K_AGGRGATOR_SDKS } from "./swap.constants"
import { SUI_CLIENTS } from "../clients"
import { SuiClient } from "@mysten/sui/client"
import SevenK from "@7kprotocol/sdk-ts"

export const createCetusAggregator = (): 
Provider<Record<Network, AggregatorClient>> => (
    {
        provide: CETUS_AGGRGATOR_SDKS,
        inject: [SUI_CLIENTS],
        useFactory: (
            clients: Record<Network, Array<SuiClient>>,
        ) => {
            const createClient = (network: Network) => new AggregatorClient({
                client: clients[network][0],
            })
            return {
                [Network.Mainnet]: createClient(Network.Mainnet),
                [Network.Testnet]: createClient(Network.Testnet),
            }
        }
    }
)

export const createSevenKAggregator = (): Provider<Record<Network, typeof SevenK>> => (
    {
        provide: SEVEN_K_AGGRGATOR_SDKS,
        inject: [SUI_CLIENTS],
        useFactory: (clients: Record<Network, Array<SuiClient>>) => {
            const createClient = (network: Network) => {
                SevenK.Config.setSuiClient(
                    clients[network][1],
                )
                return SevenK
            }
            return {
                [Network.Mainnet]: createClient(Network.Mainnet),
                [Network.Testnet]: createClient(Network.Testnet),
            }
        }
    }
)