import { Inject } from "@nestjs/common"
import { PRIVY_CLIENT } from "./constants"

export const InjectPrivyClient = () => Inject(PRIVY_CLIENT)