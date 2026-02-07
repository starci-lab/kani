/** REST API config for executor jobs. */
export const executorRestConfig = () => ({
    jobs: () => ({
        tags: "jobs",
        api: () => ({
            addWithdrawJob: {
                path: "add-withdraw-job",
            },
        }),
    }),
})
