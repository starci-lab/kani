import { Inject } from "@nestjs/common"
import { RAYDIUM_CLMM_SDK } from "./constants"
export const InjectRaydiumClmmSdk = () => Inject(RAYDIUM_CLMM_SDK)
