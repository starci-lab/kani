import { InjectMongoose, OauthProviderName, UserSchema } from "@modules/databases"
import { Injectable } from "@nestjs/common"
import { Connection } from "mongoose"
import { UserGoogleLike } from "@modules/passport"
import { KeypairsService } from "@modules/blockchains"
import { JwtAuthService } from "@modules/passport/jwt"
import { GoogleCallbackV1Response } from "./auth-v1.dto"
import { CodeGeneratorService } from "@modules/code"
import { ReferralCodeAlreadyExistsException } from "@modules/errors"

@Injectable()
export class AuthV1Service {
    constructor(
        @InjectMongoose()
        private readonly connection: Connection,
        private readonly keypairsService: KeypairsService,
        private readonly jwtAuthService: JwtAuthService,
        private readonly codeGeneratorService: CodeGeneratorService,
    ) {}

    async handleGoogleCallbackV1(
        userLike: UserGoogleLike
    ): Promise<GoogleCallbackV1Response> {
        // create new user
        const keypairs = await this.keypairsService.generateKeypairs()
        // generate up-to 20 referral codes
        const referralCodes = this.codeGeneratorService.generateCodes("KANI", 20)
        // find the first referral code that is not already used
        const existingCodes = await this.connection.model<UserSchema>(UserSchema.name)
            .find({ referralCode: { $in: referralCodes } })
            .distinct("referralCode")  // only get the array of existing codes
        // find the first referral code that is not already used
        const uniqueReferralCode = referralCodes.find(code => !existingCodes.includes(code))
        // if no unique referral code is found, throw an error
        if (!uniqueReferralCode) {
            throw new ReferralCodeAlreadyExistsException("Referral code already exists")
        }
        // create user
        await this.connection.model<UserSchema>(UserSchema.name).findOneAndUpdate(
            {
                oauthProviderId: userLike.oauthProviderId,
                oauthProvider: OauthProviderName.Google,
            },
            {
                $setOnInsert: {
                    evm: keypairs.evmKeypair,
                    sui: keypairs.suiKeypair,
                    solana: keypairs.solanaKeypair,
                    oauthProviderId: userLike.oauthProviderId,
                    oauthProvider: OauthProviderName.Google,
                    referralCode: uniqueReferralCode,
                    email: userLike.email,
                    picture: userLike.picture,
                },
            },
            {
                new: true,        // return the document after update or insert
                upsert: true,     // if not found, create a new one
            },
        )
        // we create a temporary access token for the user
        // to allow the user to continue the authentication process
        const temporaryAccessToken = await this.jwtAuthService.generateTemporaryAccessToken(userLike)
        return { temporaryAccessToken, destinationUrl: userLike.destinationUrl } 
    }
}
