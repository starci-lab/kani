import { Entity, ManyToOne, JoinColumn, Column } from "typeorm"
import { UuidAbstractEntity } from "./abstract"
import { UserEntity } from "./user.entity"
import { LiquidityPoolEntity } from "./liquidity-pool.entity"

@Entity({ name: "added_liquidity_pools" })
export class AddedLiquidityPoolEntity extends UuidAbstractEntity {
    @ManyToOne(() => UserEntity, (user) => user.addedLiquidityPools, {
        onDelete: "CASCADE",
    })
    @JoinColumn({ name: "user_id" })
        user: UserEntity

    @ManyToOne(() => LiquidityPoolEntity, (pool) => pool.assignedUsers, {
        onDelete: "CASCADE",
    })
    @JoinColumn({ name: "pool_id" })
        pool: LiquidityPoolEntity

    // position info, since each wallet we only track 1 position
    @Column({ type: "text", nullable: true, name: "position_id" })
        positionId?: string

    @Column({ type: "int", nullable: true, name: "tick_lower" })
        tickLower: number

    @Column({ type: "int", nullable: true, name: "tick_upper" })
        tickUpper: number

    @Column({ type: "numeric", nullable: true, name: "liquidity" })
        liquidity: string

    @Column({ type: "numeric", nullable: true, name: "amount_to_add" })
        amountToAdd?: string
}
