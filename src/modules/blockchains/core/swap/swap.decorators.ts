import { Inject } from "@nestjs/common"
import { CETUS_AGGRGATOR_SDKS, SEVEN_K_AGGRGATOR_SDKS } from "./swap.constants"

export const InjectCetusAggregatorSdks = () => Inject(CETUS_AGGRGATOR_SDKS) 
export const InjectSevenKAggregatorSdks = () => Inject(SEVEN_K_AGGRGATOR_SDKS)