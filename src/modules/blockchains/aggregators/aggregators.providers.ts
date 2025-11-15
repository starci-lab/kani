import { Provider } from "@nestjs/common"
import { createJupiterApiClient, SwapApi } from "@jup-ag/api"
import { JUPITER_AGGREGATOR_SDK } from "./constants"

export const createJupiterAggregatorSdkProvider = (): Provider<SwapApi> => ({
    provide: JUPITER_AGGREGATOR_SDK,
    useFactory: () => {
        return createJupiterApiClient()
    },
})

