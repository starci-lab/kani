import { Injectable } from "@nestjs/common"
import { nanoid } from "nanoid"

@Injectable()
export class CodeGeneratorService {
    constructor() {}

    generateCode(prefix: string): string {
        // nanoid 10 characters
        // chance to duplicate is 1/10^10 ~ very low
        return `${prefix}-${nanoid(10)}`
    }

    generateCodes(prefix: string, count: number): Array<string> {
        return Array.from({ length: count }, () => this.generateCode(prefix))
    }
}