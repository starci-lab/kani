import { Injectable } from "@nestjs/common"
import { TokenType } from "@typedefs"
import { address, Address, Instruction } from "@solana/kit"
import { BN } from "turbos-clmm-sdk"
import { PrimaryMemoryStorageService, TokenId } from "@modules/databases"
import { TokenNotFoundException } from "@exceptions"
import { getTransferSolInstruction } from "@solana-program/system"
import { createNoopSigner } from "@solana/signers"
import { getTransferInstruction, getTransferInstruction as getTransferInstruction2022 } from "@solana-program/token-2022"
import { AtaInstructionService } from "./ata-instruction.service"

@Injectable()
export class TransferInstructionService {
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly ataInstructionService: AtaInstructionService,
    ) { }

    async createTransferInstructions(
        {
            fromAddress,
            toAddress,
            amount,
            tokenId,
        }: CreateTransferInstructionsParams
    ): Promise<CreateTransferInstructionsResponse> {
        const token = this.primaryMemoryStorageService.tokens.find(token => token.displayId === tokenId.toString())
        if (!token) {
            throw new TokenNotFoundException("From token not found")
        }
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
        const _getTransferInstruction = token.is2022Token ? getTransferInstruction2022 : getTransferInstruction
        instructions.push(
            _getTransferInstruction({
                source: sourceAtaAddress,
                destination: destinationAtaAddress,
                authority: createNoopSigner(fromAddress),
                amount: BigInt(amount.toString()),
            }))
        return {
            instructions,
        }
    }
}

export interface CreateTransferInstructionsParams {
    fromAddress: Address
    toAddress: Address
    amount: BN
    tokenId: TokenId
}

export interface CreateTransferInstructionsResponse {
    instructions: Array<Instruction>
}
