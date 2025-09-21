import { Entity, ManyToOne, JoinColumn, OneToMany, Column } from "typeorm"
import { UuidAbstractEntity } from "./abstract"
import { UserEntity } from "./user.entity"
import { LiquidityPoolEntity } from "./liquidity-pool.entity"
import { PositionEntity } from "./position.entity"

@Entity({ name: "assigned_liquidity_pools" })
export class AssignedLiquidityPoolEntity extends UuidAbstractEntity {
    @ManyToOne(() => UserEntity, (user) => user.assignedLiquidityPools, 
        { onDelete: "CASCADE" }
    )
    @JoinColumn({ name: "user_id" })
        user: UserEntity

    @ManyToOne(() => LiquidityPoolEntity, (pool) => pool.assignedLiquidityPools, 
        { onDelete: "CASCADE" }
    )
    @JoinColumn({ name: "liquidity_pool_id" })
        liquidityPool: LiquidityPoolEntity

    @Column({ type: "text", name: "liquidity_pool_id" })
        liquidityPoolId: string

    @OneToMany(() => PositionEntity, (position) => position.assignedLiquidityPool)
        positions: Array<PositionEntity>
}