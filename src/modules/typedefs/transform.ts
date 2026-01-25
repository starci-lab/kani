export type ToStringObject<T> = {
    [K in keyof T]: string
  }