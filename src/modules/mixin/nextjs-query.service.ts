import {
    Injectable,
    OnModuleDestroy,
    OnModuleInit
} from "@nestjs/common"
import puppeteer from "puppeteer-extra"
import StealthPlugin from "puppeteer-extra-plugin-stealth"
import {
    Browser,
    Page
} from "puppeteer"
import type {
    NextJsQueryGetParams,
    NextJsQueryGetResult
} from "./types"

puppeteer.use(StealthPlugin())

/**
 * Service for scraping data from Next.js apps via Puppeteer (headless browser).
 */
@Injectable()
export class NextJsQueryService implements OnModuleInit, OnModuleDestroy {
    private browser: Browser
    private pageMap: Record<string, Page> = {
    }

    async onModuleInit(): Promise<void> {
        this.browser = await puppeteer.launch({
            headless: true,
            args: ["--no-sandbox",
                "--disable-setuid-sandbox"],
        })
    }

    async onModuleDestroy(): Promise<void> {
        if (this.browser) await this.browser.close()
    }

    /**
     * Register a page for a base URL (navigates and waits for network idle).
     */
    async addPage(url: string): Promise<void> {
        const page = await this.browser.newPage()
        await page.goto(url,
            {
                waitUntil: "networkidle2" 
            })
        this.pageMap[url] = page
    }

    /**
     * GET from the pre-loaded page for baseUrl; path and query params are applied.
     */
    async get<T>(params: NextJsQueryGetParams): Promise<NextJsQueryGetResult<T>> {
        const { baseUrl, path, params: queryParams = {
        } } = params
        const stringParams = Object.fromEntries(
            Object.entries(queryParams).map(([key,
                value]) => [
                key,
                value.toString(),
            ]),
        )
        const page = this.pageMap[baseUrl]
        if (!page) {
            throw new Error(
                `Page for URL "${baseUrl}" not found. Call addPage first.`,
            )
        }
        const query = new URLSearchParams(stringParams).toString()
        const fullPath = query ? `${path}?${query}` : path
        const data = await page.evaluate(
            async (fp: string) => {
                const res = await fetch(fp,
                    {
                        method: "GET" 
                    })
                return res.json()
            },
            fullPath,
        )
        return data
    }
}
