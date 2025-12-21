import { Field, ObjectType } from "@nestjs/graphql"

@ObjectType({
    isAbstract: true,
    description: "Input fields required to paginate results.",
})
export class ChartSerie {
  @Field(() => Date, {
      description: "The timestamp of the serie.",
  })
      timestamp: Date
}

export interface IChartSerie<T> {
    timestamp: Date
    value: T
}