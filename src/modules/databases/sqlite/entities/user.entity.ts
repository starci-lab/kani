import { Entity, OneToMany } from "typeorm"
import { UuidAbstractEntity } from "./abstract"
import { UserAllocationEntity } from "./user-allocation.schema"

@Entity({ name: "users" })
export class UserEntity extends UuidAbstractEntity {
    @OneToMany(() => UserAllocationEntity, (alloc) => alloc.user)
        allocations?: Array<UserAllocationEntity>
}


