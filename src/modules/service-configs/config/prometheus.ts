/** REST API config for executor jobs. */
export const prometheusRestConfig = () => ({
    jobs: () => ({
        tags: "metrics",
    }),
})
