import { Entity, ManyToOne, JoinColumn, Column } from "typeorm"
import { UuidAbstractEntity } from "./abstract"
import { UserEntity } from "./user.entity"
import { LiquidityPoolEntity } from "./liquidity-pool.entity"

@Entity({ name: "assigned_liquidity_pools" })
export class AssignedLiquidityPoolEntity extends UuidAbstractEntity {
    @ManyToOne(() => UserEntity, (user) => user.assignedLiquidityPools, 
        { onDelete: "CASCADE" }
    )
    @JoinColumn({ name: "user_id" })
        user: UserEntity

    @ManyToOne(() => LiquidityPoolEntity, (pool) => pool.assignedUsers, 
        { onDelete: "CASCADE" }
    )
    @JoinColumn({ name: "pool_id" })
        pool: LiquidityPoolEntity

    @Column(() => Boolean)
        priorityAOverB: boolean
}