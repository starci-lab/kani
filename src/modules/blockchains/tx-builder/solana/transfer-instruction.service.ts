import {
    Injectable
} from "@nestjs/common"
import {
    TokenType
} from "../../enums"
import {
    address,
    Instruction
} from "@solana/kit"
import {
    getTransferSolInstruction
} from "@solana-program/system"
import {
    createNoopSigner
} from "@solana/signers"
import {
    getTransferInstruction as getTransferInstruction2022
} from "@solana-program/token-2022"
import {
    getTransferInstruction
} from "@solana-program/token"
import {
    AtaInstructionService
} from "./ata-instruction.service"
import {
    CreateTransferInstructionsParams,
    CreateTransferInstructionsResult
} from "../types"

/**
 * Service for building Solana transfer instructions (native SOL or SPL/Token-2022).
 *
 * @example
 * const { instructions } = await transferInstructionService.createTransferInstructions({ fromAddress, toAddress, amount, token })
 */
@Injectable()
export class TransferInstructionService {
    constructor(
        private readonly ataInstructionService: AtaInstructionService,
    ) {}

    /**
     * Builds instructions to transfer native SOL or token (creating ATAs if needed).
     *
     * @param param - From/to addresses, amount, and token (type, address, is2022)
     * @returns List of instructions (create ATA if needed + transfer)
     *
     * @example
     * const result = await service.createTransferInstructions({ fromAddress, toAddress, amount, token })
     */
    async createTransferInstructions({
        fromAddress,
        toAddress,
        amount,
        token,
    }: CreateTransferInstructionsParams): Promise<CreateTransferInstructionsResult> {
        if (token.type === TokenType.Native) {
            return {
                instructions: [
                    getTransferSolInstruction({
                        source: createNoopSigner(fromAddress),
                        destination: toAddress,
                        amount: BigInt(amount.toString()),
                    })
                ],
            }
        }

        const instructions: Array<Instruction> = []

        const {
            ataAddress: sourceAtaAddress,
            instructions: createAtaInstructions,
        } = await this.ataInstructionService.getOrCreateAtaInstructions({
            ownerAddress: fromAddress,
            tokenMint: address(token.tokenAddress),
            is2022Token: token.is2022Token,
        })
        if (createAtaInstructions?.length) {
            instructions.push(...createAtaInstructions)
        }

        const {
            ataAddress: destinationAtaAddress,
            instructions: transferAtaInstructions,
        } = await this.ataInstructionService.getOrCreateAtaInstructions({
            ownerAddress: toAddress,
            tokenMint: address(token.tokenAddress),
            is2022Token: token.is2022Token,
        })
        if (transferAtaInstructions?.length) {
            instructions.push(...transferAtaInstructions)
        }

        const _getTransferInstruction = token.is2022Token
            ? getTransferInstruction2022
            : getTransferInstruction
        instructions.push(
            _getTransferInstruction({
                source: sourceAtaAddress,
                destination: destinationAtaAddress,
                authority: createNoopSigner(fromAddress),
                amount: BigInt(amount.toString()),
            })
        )

        return {
            instructions 
        }
    }
}
