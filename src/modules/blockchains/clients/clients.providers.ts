import { Provider } from "@nestjs/common"
import { SuiClient } from "@mysten/sui/client"
import { SOLANA_CLIENTS, SUI_CLIENTS } from "./clients.constants"
import { ChainId, Network } from "@modules/common"
import { envConfig } from "@modules/env"
import { clusterApiUrl, Connection } from "@solana/web3.js"
import { HttpAndWsClients } from "./types"

export const createSuiClientsProvider = (): Provider<
  Record<Network, HttpAndWsClients<SuiClient>>
> => ({
    provide: SUI_CLIENTS,
    useFactory: () => {
        const createHttpClients = (network: Network) =>
            Array.from(
                { length: 10 },
                (_, index) =>
                {
                    return new SuiClient({
                        url: envConfig().rpcs[ChainId.Sui].http[network][index],
                        network,
                    })
                }
            )
        // const createWsClients = (network: Network) =>
        //     Array.from(
        //         { length: 10 },
        //         (_, index) =>
        //         {
        //             return new SuiClient({
        //                 url: envConfig().rpcs[ChainId.Sui].ws[network][index],
        //                 network,
        //             })
        //         }
        //     )
        return {
            [Network.Mainnet]: {
                http: createHttpClients(Network.Mainnet),
                ws: createHttpClients(Network.Mainnet),
            },
            [Network.Testnet]: {
                http: createHttpClients(Network.Testnet),
                ws: createHttpClients(Network.Testnet),
            },
        }
    },
})

export const createSolanaClientsProvider = (): Provider<
  Record<Network, HttpAndWsClients<Connection>>
> => ({
    provide: SOLANA_CLIENTS,
    useFactory: () => {
        const createHttpClients = (network: Network) =>
            Array.from(
                { length: 10 },
                (_, index) =>
                    new Connection(envConfig().rpcs[ChainId.Solana].http[network][index] || clusterApiUrl(network === Network.Mainnet ? "mainnet-beta" : "devnet")),
                { commitment: "confirmed" }
            )

        const createWsClients = (network: Network) =>
            Array.from(
                { length: 10 },
                (_, index) =>
                    new Connection(
                        envConfig().rpcs[ChainId.Solana].ws[network][index] || clusterApiUrl(network === Network.Mainnet ? "mainnet-beta" : "devnet")),
                { commitment: "confirmed" }
            )
        return {
            [Network.Mainnet]: {
                http: createHttpClients(Network.Mainnet),
                ws: createWsClients(Network.Mainnet),
            },
            [Network.Testnet]: {
                http: createHttpClients(Network.Testnet),
                ws: createWsClients(Network.Testnet),
            },
        }
    },
})
