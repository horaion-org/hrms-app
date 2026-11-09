import {
	APPROVAL_SUBJECTS,
	type ApprovalFlow,
	type ApprovalSubject,
} from "@/features/approvals/api";

/**
 * Each subject's short name: the `?subject=` value that opens its group in
 * Settings › Approvals, and the segment of its copy under
 * `approvals.flows.subjects`.
 */
export const SUBJECT_SLUGS = {
	SCHEDULE_PUBLICATION: "roster",
	LEAVE_REQUEST: "leave",
} as const satisfies Record<ApprovalSubject, string>;

export type ApprovalSubjectSlug = (typeof SUBJECT_SLUGS)[ApprovalSubject];

/** Where a subject's copy sits in the translations, e.g. `approvals.flows.subjects.leave`. */
export const subjectCopyKey = (
	subject: ApprovalSubject
): `approvals.flows.subjects.${ApprovalSubjectSlug}` =>
	`approvals.flows.subjects.${SUBJECT_SLUGS[subject]}`;

/** The subject a short name stands for; undefined for anything else. */
export const subjectOfSlug = (slug: unknown): ApprovalSubject | undefined =>
	APPROVAL_SUBJECTS.find((subject) => SUBJECT_SLUGS[subject] === slug);

/** One subject's flows, in the API's order (the company default first). */
export const flowsOfSubject = (
	flows: ReadonlyArray<ApprovalFlow>,
	subject: ApprovalSubject
): Array<ApprovalFlow> => flows.filter((flow) => flow.subjectType === subject);

/**
 * What decides a request where the subject's table names no flow that is on:
 * - `none`: the subject has no flow at all; one person decides, as before;
 * - `oneStep`: only some departments have a flow; the rest decide in one step;
 * - `companyDefault`: the company default is on and covers the rest;
 * - `everyDepartment`: the company default is on and no department has its
 *   own flow, so it covers every department.
 */
export type FallbackLine =
	"none" | "oneStep" | "companyDefault" | "everyDepartment";

/** The line under a subject's flows, from that subject's flows alone. */
export const fallbackLineOf = (
	flows: ReadonlyArray<Pick<ApprovalFlow, "departmentId" | "active">>
): FallbackLine => {
	if (flows.length === 0) return "none";
	const defaultIsOn = flows.some(
		(flow) => flow.departmentId === null && flow.active
	);
	if (!defaultIsOn) return "oneStep";
	return flows.some((flow) => flow.departmentId !== null)
		? "companyDefault"
		: "everyDepartment";
};
