import {
    Injectable
} from "@nestjs/common"
import {
    customAlphabet,
    nanoid
} from "nanoid"
import {
    CODE_NANOID_LENGTH,
    NUMBERS_ALPHABET,
    OTP_CODE_LENGTH
} from "./constants"
import type {
    GenerateCodeResult,
    GenerateCodesParams,
    GenerateCodesResult,
    GenerateOtpCodeResult
} from "./types"

const nanoidNumbers = customAlphabet(NUMBERS_ALPHABET,
    OTP_CODE_LENGTH)

/**
 * Service for generating unique codes and OTP codes (nanoid-based).
 *
 * @example
 * codeGeneratorService.generateCode("bot")
 * codeGeneratorService.generateOtpCode()
 */
@Injectable()
export class CodeGeneratorService {
    constructor() {}

    /**
     * Generates a unique code with prefix and nanoid suffix.
     *
     * @param prefix - Prefix (e.g. "bot", "session")
     * @returns Code string like "prefix-xxxxxxxxxx"
     *
     * @example
     * const code = codeGeneratorService.generateCode("bot")
     */
    generateCode(prefix: string): GenerateCodeResult {
        return `${prefix}-${nanoid(CODE_NANOID_LENGTH)}`
    }

    /**
     * Generates multiple codes with the same prefix.
     *
     * @param param - Prefix and count
     * @returns Array of code strings
     *
     * @example
     * const codes = codeGeneratorService.generateCodes({ prefix: "inv", count: 5 })
     */
    generateCodes({
        prefix,
        count,
    }: GenerateCodesParams): GenerateCodesResult {
        return Array.from(
            {
                length: count 
            },
            () => this.generateCode(prefix)
        )
    }

    /**
     * Generates a numeric OTP code (digits only, fixed length).
     *
     * @returns OTP code string
     *
     * @example
     * const otp = codeGeneratorService.generateOtpCode()
     */
    generateOtpCode(): GenerateOtpCodeResult {
        return nanoidNumbers()
    }
}
