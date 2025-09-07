import { Column, Entity, JoinColumn, ManyToOne } from "typeorm"
import { UuidAbstractEntity } from "./abstract"
import { UserAllocationEntity } from "./user-allocation.schema"

@Entity({ name: "user_cummulatives" })
export class UserCummulativeEntity extends UuidAbstractEntity {
  @Column({ type: "real", default: 0 })
      cumulativeCapital: number

  @Column({ type: "real", default: 0 })
      pnl: number

  @Column({ type: "real", default: 0 })
      roi: number

  @ManyToOne(() => UserAllocationEntity, (allocation) => allocation.cummulatives, { onDelete: "CASCADE" })
  @JoinColumn({ name: "allocation_id" })
      allocation: UserAllocationEntity
}
