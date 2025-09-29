import { Inject, Injectable } from "@nestjs/common"
import speakeasy from "speakeasy"
import { MODULE_OPTIONS_TOKEN } from "./totp.module-definition"
import { TotpOptions } from "./types"

@Injectable()
export class TotpService {
    constructor(
        @Inject(MODULE_OPTIONS_TOKEN)
        private readonly options: TotpOptions,
    ) {}
    // 1. Create secret for user
    generateSecret(
        email: string,
    ) {
        const secret = speakeasy.generateSecret({
            name: `${this.options.appName} (${email})`, 
            // Display name in Google Authenticator
        })
        return secret // contains base32, otpauth_url,...
    }

    // 3. Verify user's entered code
    verifyTotp(token: string, base32Secret: string) {
        return speakeasy.totp.verify({
            secret: base32Secret,
            encoding: "base32",
            token,
            window: 1, // allow 1 step (30s)
        })
    }
}