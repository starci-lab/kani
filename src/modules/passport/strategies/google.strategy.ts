import { envConfig } from "@modules/env"
import { Injectable } from "@nestjs/common"
import { PassportStrategy } from "@nestjs/passport"
import { Profile, Strategy, VerifyCallback } from "passport-google-oauth20"
import { Request } from "express"
import { InjectSuperJson } from "@modules/mixin"
import SuperJSON from "superjson"
import { UserGoogleLike } from "../types"
import { EncryptionService } from "@modules/crypto"

interface GoogleAuthState {
    referralCode?: string
    destinationUrl?: string
}

interface GoogleAuthOptions {
    scope?: Array<string>
    state?: string
    accessType?: "online" | "offline"
    prompt?: "none" | "consent" | "select_account"
}

@Injectable()
export class GoogleAuthStrategy extends PassportStrategy(Strategy) {
    constructor(
        @InjectSuperJson()
        private readonly superJson: SuperJSON,
        private readonly encryptionService: EncryptionService
    ) { 
        super({
            // google console auth
            clientID: envConfig().googleCloud.oauth.clientId,
            clientSecret: envConfig().googleCloud.oauth.clientSecret,
            callbackURL: envConfig().googleCloud.oauth.redirectUri,
            scope: ["email", "profile"],
            passReqToCallback: true
        })
    }

    async authenticate(
        req: Request, 
        options: GoogleAuthOptions
    ) {
        // referral code is the code that the user used to refer another user to the platform
        let referralCode: string | undefined = undefined
        // destination url is the url that the user will be redirected to after they log in
        let destinationUrl: string | undefined = undefined
        if (req.query.referralCode) {
            referralCode = req.query.referralCode as string
        }
        if (req.query.destinationUrl) {
            destinationUrl = req.query.destinationUrl as string
        }
        const state = this.encryptionService.encrypt(
            this.superJson.stringify({
                referralCode,
                destinationUrl
            }))
        super.authenticate(
            req, {
                ...options,
                state
            })
    }


    async validate(
        req: Request,
        accessToken: string,
        refreshToken: string,
        profile: Profile,
        done: VerifyCallback,
    ) {
        const state = this.superJson.parse<GoogleAuthState>(
            this.encryptionService.decrypt(req.query.state as string)
        )
        const { emails, photos, id, displayName } = profile
        // create user
        const user: UserGoogleLike = {
            email: emails?.at(0)?.value || "",
            username: displayName,
            picture: photos?.at(0)?.value || "",
            referralCode: state.referralCode,
            oauthProviderId: id,
            destinationUrl: state.destinationUrl
        }
        // return user
        done(null, user)
    }
}
