import type { LeaveStatus } from "@/features/leave/api";

export type {
	LeaveRequest,
	LeaveRequestBody,
	LeaveStatus,
	LeaveType,
} from "@/features/leave/api";

/** The Badge tone each status is drawn with. */
export const statusTone: Record<LeaveStatus, "success" | "warning" | "error"> =
	{
		APPROVED: "success",
		PENDING: "warning",
		REJECTED: "error",
	};
