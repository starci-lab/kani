import { Inject } from "@nestjs/common"
import { MOMENTUM_CLMM_SDKS } from "./momentum.constants"
export const InjectMomentumClmmSdks = () => Inject(MOMENTUM_CLMM_SDKS)
