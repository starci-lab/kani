import { Provider } from "@nestjs/common"
import { createJupiterApiClient, SwapApi } from "@jup-ag/api"
import { JUPITER_AGGREGATOR_SDK } from "./constants"

export const createJupiterAggregatorSdkProvider = (): Provider<SwapApi> => ({
    provide: JUPITER_AGGREGATOR_SDK,
    useFactory: () => {
        return createJupiterApiClient({
            apiKey: "bf7f948e-1a9c-4cf9-8d6f-5c0d9effcfdb"
        })
    },
})

