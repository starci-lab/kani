/** Result of generating a single code (prefix + nanoid). */
export type GenerateCodeResult = string

/** Params for generating multiple codes with same prefix. */
export interface GenerateCodesParams {
    prefix: string
    count: number
}

/** Result of generating multiple codes. */
export type GenerateCodesResult = Array<string>

/** Result of generating an OTP code (numeric string). */
export type GenerateOtpCodeResult = string
