/** REST API config for interface callbacks. */
export const interfaceRestConfig = () => ({
    callback: () => ({
        tags: "callback",
        api: () => ({
            confirmWithdrawal: {
                path: "confirm-withdrawal",
            },
        }),
    }),
})
