import { Inject } from "@nestjs/common"
import { PRIVY } from "./constants"

export const InjectPrivy = () => Inject(PRIVY)