import type { LockVariant } from "@/types";
import { Lock, Moon, Pause, type LucideIcon } from "lucide-react";

// type LockVariant = 'waking' | 'paused' | 'offline';

export const LOCK_VARIANT = {
    WAKING: 'waking',
    PAUSED: 'paused',
    OFFLINE: 'offline',
} as const;

export const LOCK_PILL: Record<
  LockVariant,
  { id: string; label: string; classes: string; Icon: LucideIcon }
> = {
  waking: {
    id: LOCK_VARIANT.WAKING,
    label: 'Waking…',
    classes: 'bg-amber-100 text-amber-700',
    Icon: Moon,
  },
  paused: {
    id: LOCK_VARIANT.PAUSED,
    label: 'Paused',
    classes: 'bg-slate-100 text-slate-600',
    Icon: Pause,
  },
  offline: {
    id: LOCK_VARIANT.OFFLINE,
    label: 'Offline',
    classes: 'bg-red-100 text-red-700',
    Icon: Lock,
  },
} as const;