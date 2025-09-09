// assigned-liquidity-pool.entity.ts
import { Entity, ManyToOne, JoinColumn } from "typeorm"
import { UuidAbstractEntity } from "./abstract"
import { UserEntity } from "./user.entity"
import { LiquidityPoolEntity } from "./liquidity-pool.entity"

@Entity({ name: "assigned_liquidity_pools" })
export class AssignedLiquidityPoolEntity extends UuidAbstractEntity {
    @ManyToOne(() => UserEntity, (user) => user.assignedSuiPools, { onDelete: "CASCADE", nullable: true })
    @JoinColumn({ name: "sui_user_id" })
        suiUser?: UserEntity

    @ManyToOne(() => UserEntity, (user) => user.assignedSolanaPools, { onDelete: "CASCADE", nullable: true })
    @JoinColumn({ name: "solana_user_id" })
        solanaUser?: UserEntity

    @ManyToOne(() => LiquidityPoolEntity, (pool) => pool.assignedUsers, { onDelete: "CASCADE" })
    @JoinColumn({ name: "pool_id" })
        pool: LiquidityPoolEntity
}