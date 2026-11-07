import type { LeaveStatus } from "@/features/leave/api";

export type {
	LeaveRequest,
	LeaveRequestBody,
	LeaveStatus,
} from "@/features/leave/api";

/** The Badge tone each status is drawn with. */
export const statusTone: Record<
	LeaveStatus,
	"success" | "warning" | "error" | "neutral"
> = {
	APPROVED: "success",
	PENDING: "warning",
	REJECTED: "error",
	CANCELLED: "neutral",
};
