import { Inject } from "@nestjs/common"
import { HERMES_CLIENT } from "./constants"

export const InjectHermesClient = () => Inject(HERMES_CLIENT)