import { Inject } from "@nestjs/common"
import { CETUS_AGGREGATOR_SDKS, CETUS_CLMM_SDKS } from "./cetus.constants"

export const InjectCetusClmmSdks = () => Inject(CETUS_CLMM_SDKS)
export const InjectCetusAggregatorSdks = () => Inject(CETUS_AGGREGATOR_SDKS)  