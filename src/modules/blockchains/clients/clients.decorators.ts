import { Inject } from "@nestjs/common"
import { SOLANA_CLIENTS, SUI_CLIENTS } from "./clients.constants"

export const InjectSuiClients = () => Inject(SUI_CLIENTS)
export const InjectSolanaClients = () => Inject(SOLANA_CLIENTS)