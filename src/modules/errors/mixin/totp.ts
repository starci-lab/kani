import { BadRequestException } from "@nestjs/common"

export class TOTPCodeNotVerifiedException extends BadRequestException {
    constructor(message?: string) {
        super(message || "TOTP code not verified")
    }
}