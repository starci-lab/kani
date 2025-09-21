import { Entity, ManyToOne, JoinColumn, Column } from "typeorm"
import { UuidAbstractEntity } from "./abstract"
import { LiquidityPoolEntity } from "./liquidity-pool.entity"
import { TokenEntity } from "./token.entity"
import { LiquidityPoolId, TokenId } from "../../enums"

@Entity({ name: "reward_tokens" })
export class RewardTokenEntity extends UuidAbstractEntity {
    @ManyToOne(() => LiquidityPoolEntity, (liquidityPool) => liquidityPool.rewardTokens, { onDelete: "CASCADE" })
    @JoinColumn({ name: "liquidity_pool_id" })
        liquidityPool: LiquidityPoolEntity

    @Column({ type: "text", name: "liquidity_pool_id" })
        liquidityPoolId: LiquidityPoolId

    @ManyToOne(() => TokenEntity, (token) => token.rewardTokens, { onDelete: "CASCADE" })
    @JoinColumn({ name: "token_id" })
        token: TokenEntity

    @Column({ type: "text", name: "token_id" })
        tokenId: TokenId
}