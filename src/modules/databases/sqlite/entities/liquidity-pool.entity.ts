import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm"
import { StringAbstractEntity } from "./abstract"
import { ChainId, Network } from "@modules/common"
import { TokenEntity } from "./token.entity"
import { DexEntity } from "./dex.entity"
import { DexId, LiquidityPoolId, TokenId } from "../../enums"

@Entity({ name: "lp_pools" })
export class LiquidityPoolEntity extends StringAbstractEntity {
    @Index({ unique: true })
    @Column({ type: "text" })
        displayId: LiquidityPoolId

    @ManyToOne(() => DexEntity)
    @JoinColumn({ name: "dex_id" })
        dex: DexEntity

    @Column({ type: "text" })
        dexId: DexId

    @Column({ type: "text" })
        poolAddress: string

    @ManyToOne(() => TokenEntity)
    @JoinColumn({ name: "token_a_id" })
        tokenA: TokenEntity

    @Column({ type: "text" })
        tokenAId: TokenId

    @Column({ type: "text" })
        tokenBId: TokenId

    @ManyToOne(() => TokenEntity)
    @JoinColumn({ name: "token_b_id" })
        tokenB: TokenEntity

    @Column({ type: "real" })
        fee: number

    @Column({ type: "text" })
        network: Network

    @Column({ type: "text" })
        chainId: ChainId
}
