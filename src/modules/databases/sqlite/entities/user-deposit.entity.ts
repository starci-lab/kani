import { Column, Entity, JoinColumn, ManyToOne } from "typeorm"
import { UuidAbstractEntity } from "./abstract"
import { UserEntity } from "./user.entity"

@Entity({ name: "user_deposits" })
export class UserDepositEntity extends UuidAbstractEntity {
    @Column({ type: "real", name: "deposit_amount" })
        depositAmount: number

    @ManyToOne(() => UserEntity, (allocation) => allocation.deposits, { onDelete: "CASCADE" })
    @JoinColumn({ name: "user_id" })
        user: UserEntity
}