import { Column, Entity } from "typeorm"
import { StringAbstractEntity } from "./abstract"
import { ChainId, Network } from "@modules/common"
import { TokenId } from "@modules/databases/enums"

@Entity({ name: "tokens" })
export class TokenEntity extends StringAbstractEntity {
    @Column({ type: "text", unique: true })
        displayId: TokenId

    @Column({ type: "text" })
        name: string

    @Column({ type: "text" })
        symbol: string

    @Column({ type: "integer" })
        decimals: number

    @Column({ type: "text" })
        tokenAddress: string

    @Column({ type: "text" })
        coinMarketCapId: string

    @Column({ type: "text" })
        coinGeckoId: string

    @Column({ type: "text" })
        iconUrl: string

    @Column({ type: "text" })
        chainId: ChainId

    @Column({ type: "text" })
        projectUrl: string

    @Column({ type: "text" })
        network: Network
}


