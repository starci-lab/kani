import { Column, Entity, JoinColumn, ManyToOne } from "typeorm"
import { AbstractEntity } from "./abstract"
import { UserAllocationEntity } from "./user-allocation.schema"

@Entity({ name: "user_deposits" })
export class UserDepositEntity extends AbstractEntity {
    @Column({ type: "real" })
        depositAmount: number

    @ManyToOne(() => UserAllocationEntity, (allocation) => allocation.deposits, { onDelete: "CASCADE" })
    @JoinColumn({ name: "allocation_id" })
        allocation: UserAllocationEntity
}