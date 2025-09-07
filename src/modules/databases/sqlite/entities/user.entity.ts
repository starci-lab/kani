import { Entity, OneToMany } from "typeorm"
import { AbstractEntity } from "./abstract"
import { UserAllocationEntity } from "./user-allocation.schema"

@Entity({ name: "users" })
export class UserEntity extends AbstractEntity {
    @OneToMany(() => UserAllocationEntity, (alloc) => alloc.user)
        allocations?: Array<UserAllocationEntity>
}


