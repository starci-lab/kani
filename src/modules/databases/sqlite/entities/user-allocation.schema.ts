import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from "typeorm"
import { AbstractEntity } from "./abstract"
import { TokenEntity } from "./token.entity"
import { UserDepositEntity } from "./user-deposit.entity"
import { UserCummulativeEntity } from "./user-cummulative.entity"
import { UserEntity } from "./user.entity"

@Entity({ name: "user_allocations" })
export class UserAllocationEntity extends AbstractEntity {
        @ManyToOne(() => UserEntity, { onDelete: "CASCADE" })
        @JoinColumn({ name: "user_id" })
            user: UserEntity

        @OneToMany(() => UserDepositEntity, (deposit) => deposit.allocation)
            deposits: Array<UserDepositEntity>

        @OneToMany(() => UserCummulativeEntity, (cum) => cum.allocation)
            cummulatives: Array<UserCummulativeEntity>

        @ManyToOne(() => TokenEntity, { nullable: true })
        @JoinColumn({ name: "priority_token_id" })
            priorityToken?: TokenEntity

        @Column({ type: "boolean", default: false })
            exitToUsdc: boolean

        @Column({ type: "text", nullable: true })
            suiWalletAccountAddress?: string

        @Column({ type: "text", nullable: true })
            suiWalletEncryptedPrivateKey?: string

        @Column({ type: "text", nullable: true })
            evmWalletAccountAddress?: string

        @Column({ type: "text", nullable: true })
            evmWalletEncryptedPrivateKey?: string

        @Column({ type: "text", nullable: true })
            solanaWalletAccountAddress?: string

        @Column({ type: "text", nullable: true })
            solanaWalletEncryptedPrivateKey?: string
}