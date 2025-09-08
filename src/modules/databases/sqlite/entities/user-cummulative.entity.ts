import { Column, Entity, JoinColumn, ManyToOne } from "typeorm"
import { UuidAbstractEntity } from "./abstract"
import { UserEntity } from "./user.entity"

@Entity({ name: "user_cummulatives" })
export class UserCummulativeEntity extends UuidAbstractEntity {
  @Column({ type: "real", default: 0, name: "cumulative_capital" })
      cumulativeCapital: number

  @Column({ type: "real", default: 0, name: "pnl" })
      pnl: number

  @Column({ type: "real", default: 0, name: "roi" })
      roi: number

  @ManyToOne(() => UserEntity, (allocation) => allocation.cummulatives, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
      allocation: UserEntity
}
