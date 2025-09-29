import Sentry from "@sentry/nestjs"
import dotenv from "dotenv"
// config dotenv
dotenv.config()
// init sentry
Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 1.0,
})