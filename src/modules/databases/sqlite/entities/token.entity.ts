import { Column, Entity } from "typeorm"
import { StringAbstractEntity } from "./abstract"
import { ChainId, Network } from "@modules/common"
import { CexId, TokenId } from "@modules/databases/enums"

@Entity({ name: "tokens" })
export class TokenEntity extends StringAbstractEntity {
    @Column({ type: "text", name: "display_id", unique: true })
        displayId: TokenId

    @Column({ type: "text", name: "name" })
        name: string

    @Column({ type: "text", name: "symbol" })
        symbol: string

    @Column({ type: "integer", name: "decimals" })
        decimals: number

    @Column({ type: "text", name: "token_address" })
        tokenAddress: string

    @Column({ type: "text", name: "coin_market_cap_id" })
        coinMarketCapId: string

    @Column({ type: "text", name: "coin_gecko_id" })
        coinGeckoId: string

    @Column({ type: "text", name: "cex_symbols", nullable: true })
        cexSymbolsRaw: string
    @Column({ type: "text", name: "icon_url" })
        iconUrl: string

    @Column({ type: "text", name: "chain_id" })
        chainId: ChainId

    @Column({ type: "text", name: "project_url" })
        projectUrl: string

    @Column({ type: "text", name: "network" })
        network: Network

    @Column({ type: "simple-json", name: "cex_ids", nullable: true })
        cexIds: Array<CexId>

    @Column({ type: "text", name: "whichCex" })
        whichCex: CexId

    get cexSymbols(): Partial<Record<CexId, string>> {
        return this.cexSymbolsRaw ? JSON.parse(this.cexSymbolsRaw) : {}
    }

    set cexSymbols(value: Partial<Record<CexId, string>>) {
        this.cexSymbolsRaw = JSON.stringify(value ?? {})
    }
}


