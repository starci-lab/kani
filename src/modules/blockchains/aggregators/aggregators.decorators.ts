import { Inject } from "@nestjs/common"
import { JUPITER_AGGREGATOR_SDK } from "./constants"

export const InjectJupiterAggregatorSdk = () => Inject(JUPITER_AGGREGATOR_SDK)