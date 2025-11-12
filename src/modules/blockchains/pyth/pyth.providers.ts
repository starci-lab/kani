import { Provider } from "@nestjs/common"
import { HERMES_CLIENT } from "./constants"
import { HermesClient } from "@pythnetwork/hermes-client"

export const createHermesClientProvider = (): Provider<HermesClient> => ({
    provide: HERMES_CLIENT,
    useFactory: () => {
        return new HermesClient("https://hermes.pyth.network")
    }
})