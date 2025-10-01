import { InjectMongoose, OauthProviderName, UserSchema } from "@modules/databases"
import { Injectable } from "@nestjs/common"
import { Connection } from "mongoose"
import { UserGoogleLike } from "@modules/passport"
import { KeypairsService } from "@modules/blockchains"
import { JwtAuthService } from "@modules/passport/jwt"
import { GoogleCallbackV1Response } from "./auth-v1.dto"
import { CodeGeneratorService } from "@modules/code"
import { ReferralCodeAlreadyExistsException, CannotCreateUserException } from "@modules/errors"
import { TotpService } from "@modules/totp"
import { EncryptionService } from "@modules/crypto"

@Injectable()
export class AuthV1Service {
    constructor(
    @InjectMongoose()
    private readonly connection: Connection,
    private readonly keypairsService: KeypairsService,
    private readonly jwtAuthService: JwtAuthService,
    private readonly codeGeneratorService: CodeGeneratorService,
    private readonly totpService: TotpService,
    private readonly encryptionService: EncryptionService,
    ) {}

    async handleGoogleCallbackV1(
        userLike: UserGoogleLike
    ): Promise<GoogleCallbackV1Response> {
        // Check if the user already exists
        let user = await this.connection.model<UserSchema>(UserSchema.name).findOne({
            oauthProviderId: userLike.oauthProviderId,
            oauthProvider: OauthProviderName.Google,
        })
        // If the user does not exist, create a new one
        if (!user) {
            const keypairs = await this.keypairsService.generateKeypairs()

            const referralCodes = this.codeGeneratorService.generateCodes("KANI", 20)
            const existingCodes = await this.connection.model<UserSchema>(UserSchema.name)
                .find({ referralCode: { $in: referralCodes } })
                .distinct("referralCode")

            const uniqueReferralCode = referralCodes.find(code => !existingCodes.includes(code))
            if (!uniqueReferralCode) {
                throw new ReferralCodeAlreadyExistsException("Referral code already exists")
            }
            const totpSecret = this.totpService.generateSecret(userLike.email)
            user = await this.connection.model<UserSchema>(UserSchema.name).insertOne({
                evm: keypairs.evmKeypair,
                sui: keypairs.suiKeypair,
                solana: keypairs.solanaKeypair,
                oauthProviderId: userLike.oauthProviderId,
                oauthProvider: OauthProviderName.Google,
                referralCode: uniqueReferralCode,
                email: userLike.email,
                picture: userLike.picture,
                encryptedTotpSecret: this.encryptionService.encrypt(totpSecret.base32),
            })
            if (!user) {
                throw new CannotCreateUserException()
            }
        }
        // Generate a temporary access token so the user can continue the authentication flow
        const { accessToken } = await this.jwtAuthService.generate({
            id: user.id,
            totpVerified: userLike.totpVerified,
            encryptedTotpSecret: user.encryptedTotpSecret,
        })
        return {
            accessToken,
            destinationUrl: userLike.destinationUrl,
        }
    }
}