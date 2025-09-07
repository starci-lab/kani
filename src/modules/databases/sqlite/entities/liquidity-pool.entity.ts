import { Column, Entity, JoinColumn, ManyToOne } from "typeorm"
import { StringAbstractEntity } from "./abstract"
import { ChainId, Network } from "@modules/common"
import { TokenEntity } from "./token.entity"
import { DexEntity } from "./dex.entity"
import { DexId, LiquidityPoolId, TokenId } from "../../enums"

@Entity({ name: "lp_pools" })
export class LiquidityPoolEntity extends StringAbstractEntity {
    @Column({ type: "text", name: "display_id", unique: true })
        displayId: LiquidityPoolId

    @ManyToOne(() => DexEntity)
    @JoinColumn({ name: "dex_id" })
        dex: DexEntity

    @Column({ type: "text", name: "dex_id" })
        dexId: DexId

    @Column({ type: "text", name: "pool_address" })
        poolAddress: string

    @ManyToOne(() => TokenEntity)
    @JoinColumn({ name: "token_a_id" })
        tokenA: TokenEntity

    @Column({ type: "text", name: "token_a_id" })
        tokenAId: TokenId

    @Column({ type: "text", name: "token_b_id" })
        tokenBId: TokenId

    @ManyToOne(() => TokenEntity)
    @JoinColumn({ name: "token_b_id" })
        tokenB: TokenEntity

    @Column({ type: "real", name: "fee" })
        fee: number

    @Column({ type: "text", name: "network" })
        network: Network

    @Column({ type: "text", name: "chain_id" })
        chainId: ChainId
}
