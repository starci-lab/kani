import { Provider } from "@nestjs/common"
import { RAYDIUM_CLMM_SDK } from "./constants"
import { Raydium } from "@raydium-io/raydium-sdk-v2"
import { Connection } from "@solana/web3.js"
import { HttpAndWsClients } from "../../clients"
import { Network } from "@modules/common"
import { RAYDIUM_CLIENTS_INDEX } from "./constants"
import { SOLANA_CLIENTS } from "../../clients"

export const createRaydiumClmmSdkProvider = (): Provider<Raydium> => ({
    provide: RAYDIUM_CLMM_SDK,
    inject: [SOLANA_CLIENTS],
    useFactory: async (
        clients: Record<Network, HttpAndWsClients<Connection>>
    ) => {
        return await Raydium.load({
            connection: clients[Network.Mainnet].http[RAYDIUM_CLIENTS_INDEX],
        })
    }
})