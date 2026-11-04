import type { TFunction } from "i18next";
import type { LeaveRequest } from "@/features/leave/api";

/**
 * The codes of the fixed list an API older than the company leave type
 * catalogue still answers with, and which the app can name itself. Any other
 * code is a company's own type, named only by the API.
 */
const LEGACY_LEAVE_TYPE_CODES = [
	"ANNUAL",
	"SICK",
	"HOSPITALISATION",
	"COMPASSIONATE",
	"MATERNITY",
	"UNPAID",
	"MARRIAGE",
] as const;

type LegacyLeaveTypeCode = (typeof LEGACY_LEAVE_TYPE_CODES)[number];

const isLegacyLeaveTypeCode = (code: string): code is LegacyLeaveTypeCode =>
	(LEGACY_LEAVE_TYPE_CODES as ReadonlyArray<string>).includes(code);

/**
 * What a request's leave type is called: the company's own name when the API
 * sends one, the app's words for a code of the old fixed list, or a generic
 * "Leave" for a code the app has never seen.
 */
export const leaveTypeLabel = (
	request: Pick<LeaveRequest, "leaveType" | "leaveTypeName">,
	t: TFunction
): string => {
	if (request.leaveTypeName) return request.leaveTypeName;
	if (isLegacyLeaveTypeCode(request.leaveType))
		return t(`leave.types.${request.leaveType}`);
	return t("leave.types.unknown");
};
