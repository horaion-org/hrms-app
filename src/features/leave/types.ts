export type LeaveStatus = "approved" | "pending" | "rejected";
export type LeaveType =
	| "annual"
	| "sick"
	| "hospitalisation"
	| "compassionate"
	| "maternity"
	| "unpaid"
	| "marriage";

export type LeaveRequest = {
	id: string;
	employeeId: string;
	name: string;
	start: string;
	end: string;
	requested: string;
	days: number;
	type: LeaveType;
	status: LeaveStatus;
	country: string;
	branch: string;
	reason?: string;
};

export const statusTone = {
	approved: "success",
	pending: "warning",
	rejected: "error",
} as const;
export const leaveTypes: Array<LeaveType> = [
	"annual",
	"sick",
	"hospitalisation",
	"compassionate",
	"maternity",
	"unpaid",
	"marriage",
];
