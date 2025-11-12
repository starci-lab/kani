import { Network as OrcaNetwork } from "@orca-so/sdk"
import { Provider } from "@nestjs/common"
import { Network } from "@modules/common"
import { getOrca, Orca } from "@orca-so/sdk"
import { SOLANA_CLIENTS } from "../../clients"
import { ORCA_CLIENT_INDEX, ORCA_CLMM_SDKS } from "./constants"
import { Connection } from "@solana/web3.js"

export const createOrcaClmmSdkProvider = (): Provider<
    Record<Network, Orca>
> => ({
    provide: ORCA_CLMM_SDKS,
    inject: [SOLANA_CLIENTS],
    useFactory: (
        clients: Record<Network, Array<Connection>>
    ) => {
        const createClient = (network: Network) => {
            const client = clients[network][ORCA_CLIENT_INDEX]
            return getOrca(
                client, 
                network === Network.Mainnet 
                    ? OrcaNetwork.MAINNET 
                    : OrcaNetwork.DEVNET
            )
        }
        return {
            [Network.Mainnet]: createClient(Network.Mainnet),
            [Network.Testnet]: createClient(Network.Testnet),
        }
    },
})
