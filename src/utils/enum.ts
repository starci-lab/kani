export const createEnumType = (
    enumType: object
): Record<string, string | number> => {
    const lowerCaseEnumType = {}
    for (const key in enumType) {
        // lower the first letter of the key
        const lowerCaseKey = enumType[key]
        lowerCaseEnumType[lowerCaseKey] = enumType[key]
    }
    return lowerCaseEnumType
}