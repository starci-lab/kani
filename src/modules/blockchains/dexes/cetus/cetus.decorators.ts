import { Inject } from "@nestjs/common"
import { CETUS_CLMM_SDKS, CETUS_ZAP_SDKS } from "./cetus.constants"

export const InjectCetusClmmSdks = () => Inject(CETUS_CLMM_SDKS) 
export const InjectCetusZapSdks = () => Inject(CETUS_ZAP_SDKS)