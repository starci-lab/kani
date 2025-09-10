
import { Controller, Get, Res, UseGuards } from "@nestjs/common"
import { GoogleAuthGuard } from "@/modules/passport"
import {
    ApiOperation,
    ApiResponse,
    ApiTags,
} from "@nestjs/swagger"
import { GoogleUser, UserGoogleLike } from "@/modules/passport"
import { Response } from "express"
import { AuthV1Service } from "./auth-v1.service"
import { envConfig } from "@/modules/env"

@ApiTags("User v1")
@Controller({
    path: "auth",
    version: "1",
})
export class AuthV1Controller {
    constructor(
        private readonly authV1Service: AuthV1Service,
    ) {}

  @ApiOperation({
      summary: "Google OAuth2 Redirect (v1)",
      description:
      "Initiates the Google OAuth2 login flow by redirecting the user to Google's login page.",
  })
  @ApiResponse({ status: 302, description: "Redirects to Google login page" })
  @ApiResponse({ status: 401, description: "Unauthorized - authentication failed" })
  @ApiResponse({ status: 403, description: "Forbidden - user not allowed" })
  @UseGuards(GoogleAuthGuard)
  @Get("google/redirect")
    async redirectToGoogle() {
    // handled by GoogleAuthGuard -> redirects to Google
    }

  @ApiOperation({
      summary: "Google OAuth2 Callback (v1)",
      description:
      "Handles the callback from Google after user consent. " +
      "If successful, extracts user information and continues authentication flow.",
  })
  @ApiResponse({ status: 200, description: "Successfully authenticated with Google" })
  @ApiResponse({ status: 401, description: "Unauthorized - invalid or expired credentials" })
  @ApiResponse({ status: 403, description: "Forbidden - user not allowed" })
  @UseGuards(GoogleAuthGuard)
  @Get("google/callback")
  async handleGoogleCallback(
    @GoogleUser() user: UserGoogleLike, @Res() res: Response,
  ) {
      const { accessToken, refreshToken } = await this.authV1Service.handleGoogleCallback(user)
      const url = new URL(envConfig().frontend.url)
      url.searchParams.set("accessToken", accessToken)
      url.searchParams.set("refreshToken", refreshToken)
      res.redirect(url.toString())
  }
}
