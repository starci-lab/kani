/** Plain interface for a chart series point with value. */
export interface IChartSerie<T> {
    timestamp: Date
    value: T
}

/** Plain interface for line chart response with series. */
export interface ILineChartResponseData<T> {
    count: number
    series: Array<IChartSerie<T>>
}
