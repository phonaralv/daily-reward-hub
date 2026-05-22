// Notifications wrapper — single sonner import allowed in this file only.
// Components must import from here. ESLint blocks direct `sonner` imports elsewhere.
/* eslint-disable no-restricted-imports */
import { toast } from "sonner";

export const notify = {
  success: (msg: string, opts?: { description?: string }) =>
    toast.success(msg, opts),
  error: (msg: string, opts?: { description?: string }) =>
    toast.error(msg, opts),
  info: (msg: string, opts?: { description?: string }) =>
    toast(msg, opts),
  reward: (msg: string, opts?: { description?: string }) =>
    toast.success(msg, { ...opts, duration: 2400 }),
};

export { toast as _rawToast };
