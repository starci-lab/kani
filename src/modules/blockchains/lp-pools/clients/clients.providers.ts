import { Provider } from "@nestjs/common"
import { SuiClient } from "@mysten/sui/client"
import { SOLANA_CLIENTS, SUI_CLIENTS } from "./clients.constants"
import { ChainId, Network } from "@modules/common"
import { envConfig } from "@modules/env"
import { Connection } from "@solana/web3.js"

export const createSuiClientsProvider 
    = (): Provider<Record<Network, SuiClient>> => ({
        provide: SUI_CLIENTS,
        useFactory: () => {
            const createClient = (network: Network) => new SuiClient({
                url: envConfig().rpcs[ChainId.Sui][network],   
                network
            })
            return {
                [Network.Mainnet]: createClient(Network.Mainnet),
                [Network.Testnet]: createClient(Network.Testnet),
            }   
        }
    })

export const createSolanaClientsProvider 
    = (): Provider<Record<Network, Connection>> => ({
        provide: SOLANA_CLIENTS,
        useFactory: () => {
            const createClient = (network: Network) => new Connection(envConfig().rpcs[ChainId.Solana][network])
            return {
                [Network.Mainnet]: createClient(Network.Mainnet),
                [Network.Testnet]: createClient(Network.Testnet),
            }
        }
    })