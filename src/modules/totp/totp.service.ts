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
    generateSecret() {
        const secret = speakeasy.generateSecret({
            // Display name in Google Authenticator
            name: this.options.appName, 
            // Issuer in Google Authenticator
            issuer: "KANI",
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

    generateTotpSecretUrl(secret: string) {
        return speakeasy.otpauthURL({
            secret: secret,
            encoding: "base32",
            issuer: "KANI",
            label: this.options.appName,
        })
    }
}