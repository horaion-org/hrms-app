export const inputStatuses = ["success", "error"] as const;

export type InputStatus = (typeof inputStatuses)[number];
