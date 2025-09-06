import { Inject } from "@nestjs/common"
import { SOLANA_CLIENTS } from "./clients.constants"

export const InjectSuiClients = () => Inject(SOLANA_CLIENTS)
export const InjectSolanaClients = () => Inject(SOLANA_CLIENTS)