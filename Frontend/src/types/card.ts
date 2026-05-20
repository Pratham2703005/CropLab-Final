import { LOCK_VARIANT } from "@/constants";

export type LockVariant = typeof LOCK_VARIANT[keyof typeof LOCK_VARIANT];