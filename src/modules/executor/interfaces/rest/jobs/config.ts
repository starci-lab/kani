export const restConfig = () => ({
    jobs: () => ({
        tags: "jobs",
        api: () => ({
            addWithdrawJob: {
                path: "add-withdraw-job",
            }
        })
    })
})

export const buildEndpointPath = (tags: string, api: string) => {
    return `${tags}/${api}`
}