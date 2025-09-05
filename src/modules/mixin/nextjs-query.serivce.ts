import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common"
import puppeteer from "puppeteer-extra"
import StealthPlugin from "puppeteer-extra-plugin-stealth"
import { Browser, Page } from "puppeteer"
puppeteer.use(StealthPlugin())

// this is a special service for scraping data from websites that use Next.js
// it uses puppeteer to scrape the data
// it is used to scrape data from websites that use Next.js
@Injectable()
export class NextJsQueryService implements OnModuleInit, OnModuleDestroy {
    // Store the browser instance
    private browser: Browser
    private pageMap: Record<string, Page> = {}

    async onModuleInit() {
        // Initialize the browser
        this.browser = await puppeteer.launch({
            headless: true,
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
        })
    }

    async onModuleDestroy() {
        if (this.browser) await this.browser.close()
    }

    async addPage(url: string) {
        const page = await this.browser.newPage()
        await page.goto(url, { waitUntil: "networkidle2" })
        this.pageMap[url] = page
    }

    async get<T>(
        baseUrl: string, 
        path: string,
        params: Record<string, string | number | boolean> = {}
    ): Promise<T> {
        const stringParams = Object.fromEntries(
            Object.entries(params).map(([key, value]) => [key, value.toString()])
        )
        const page = this.pageMap[baseUrl]
        if (!page) throw new Error(`Page for URL "${baseUrl}" not found. Call addPage first.`)
        // Convert params to query string
        const query = new URLSearchParams(stringParams).toString()
        const fullPath = query ? `${path}?${query}` : path
        const data = await page.evaluate(
            async (
                fullPath
            ) => {
                const res = await fetch(
                    fullPath, 
                    { method: "GET" }
                )
                return res.json()
            }, fullPath)
        return data
    }
}