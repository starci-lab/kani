import { Column, Entity, OneToMany } from "typeorm"
import { UuidAbstractEntity } from "./abstract"
import { UserDepositEntity } from "./user-deposit.entity"
import { UserCummulativeEntity } from "./user-cummulative.entity"
import { TokenId } from "@modules/databases"
import { AssignedLiquidityPoolEntity } from "./assigned-liquidity-pool.entity"
import { WalletEntity } from "./wallet.entity"
import { AddedLiquidityPoolEntity } from "./added-liquidity-pool.entity"

@Entity({ name: "users" })
export class UserEntity extends UuidAbstractEntity {
    @OneToMany(() => UserDepositEntity, (deposit) => deposit.user)
        deposits: Array<UserDepositEntity>

    @OneToMany(() => UserCummulativeEntity, (cum) => cum.allocation)
        cummulatives: Array<UserCummulativeEntity>

    @Column({ type: "text", nullable: true, name: "priority_token_id" })
        priorityTokenId?: TokenId

    @Column({ type: "boolean", default: false, name: "exit_to_usdc" })
        exitToUsdc: boolean

    @OneToMany(() => WalletEntity, (wallet) => wallet.user, 
        { cascade: ["insert", "update"] }
    )
        wallets: Array<WalletEntity>

    @Column({ type: "boolean", default: true, name: "is_active" })
        isActive: boolean

    @OneToMany(
        () => AssignedLiquidityPoolEntity,
        (assignedLiquidityPool) => assignedLiquidityPool.user,
        { cascade: ["insert", "update"] }
    )
        assignedLiquidityPools: Array<AssignedLiquidityPoolEntity>

    @OneToMany(
        () => AddedLiquidityPoolEntity,
        (addedLiquidityPool) => addedLiquidityPool.user,
    )
        addedLiquidityPools: Array<AddedLiquidityPoolEntity>
}
