import {
    Inject, Injectable 
} from "@nestjs/common"
import speakeasy from "speakeasy"
import {
    MODULE_OPTIONS_TOKEN 
} from "./totp.module-definition"
import type {
    TotpOptions
} from "./types"

@Injectable()
export class TotpService {
    constructor(
        @Inject(MODULE_OPTIONS_TOKEN)
        private readonly options: TotpOptions,
    ) {}
    // 1. Create secret for user
    generateSecret(email: string) {
        const secret = speakeasy.generateSecret({
            // Display name in Google Authenticator
            name: this.generateTotpSecretLabel(email), 
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

    private generateTotpSecretLabel(email: string) {
        return `${this.options.appName}:${email}`
    }

    generateTotpSecretUrl(secret: string, email: string) {
        return speakeasy.otpauthURL({
            secret: secret,
            encoding: "base32",
            issuer: "KANI",
            label: this.generateTotpSecretLabel(email),
        })
    }
}