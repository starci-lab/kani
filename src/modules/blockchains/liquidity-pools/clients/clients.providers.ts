import { Provider } from "@nestjs/common"
import { SuiClient } from "@mysten/sui/client"
import { SOLANA_CLIENTS, SUI_CLIENTS } from "./clients.constants"
import { ChainId, Network } from "@modules/common"
import { envConfig } from "@modules/env"
import { clusterApiUrl, Connection } from "@solana/web3.js"

export const createSuiClientsProvider = (): Provider<
  Record<Network, Array<SuiClient>>
> => ({
    provide: SUI_CLIENTS,
    useFactory: () => {
        const createClients = (network: Network) =>
            Array.from(
                { length: 10 },
                (_, index) =>
                    new SuiClient({
                        url: envConfig().rpcs[ChainId.Sui][network][index],
                        network,
                    }),
            )
        return {
            [Network.Mainnet]: createClients(Network.Mainnet),
            [Network.Testnet]: createClients(Network.Testnet),
        }
    },
})

export const createSolanaClientsProvider = (): Provider<
  Record<Network, Array<Connection>>
> => ({
    provide: SOLANA_CLIENTS,
    useFactory: () => {
        const createClients = (network: Network) =>
            Array.from(
                { length: 10 },
                (_, index) =>
                    new Connection(envConfig().rpcs[ChainId.Solana][network][index] || clusterApiUrl(network === Network.Mainnet ? "mainnet-beta" : "devnet")),
            )
        return {
            [Network.Mainnet]: createClients(Network.Mainnet),
            [Network.Testnet]: createClients(Network.Testnet),
        }
    },
})
