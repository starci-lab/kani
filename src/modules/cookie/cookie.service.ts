import {
    envConfig 
} from "@modules/env"
import {
    Injectable 
} from "@nestjs/common"
import {
    CookieOptions, Response 
} from "express"

@Injectable()
export class CookieService {
    constructor(
    ) {}

    /**
     * Attach a secure HttpOnly cookie to the response.
     * Typically used to store refresh tokens so they are not accessible via JavaScript.
     */
    attachHttpOnlyCookie(
        res: Response,
        name: string,
        value: string,
        options?: CookieOptions
    ): void {
        const defaultOptions: CookieOptions = {
            httpOnly: true,                                // Prevents client-side JS from accessing the cookie
            secure: process.env.NODE_ENV === "production", // Only send over HTTPS in production
            sameSite: "strict",                            // Protects against CSRF
            path: "/",                                     // Cookie is valid for the entire site
            maxAge: envConfig().jwt.refreshToken.expiration,      // 30 days
        }

        res.cookie(name,
            value,
            {
                ...defaultOptions,
                ...options,
            })
    }

    /**
     * Clear a cookie by name. Commonly used on logout.
     */
    clearCookie(res: Response, name: string, options?: CookieOptions): void {
        res.clearCookie(name,
            {
                httpOnly: true,
                sameSite: "strict",
                path: "/",
                ...options,
            })
    }
}