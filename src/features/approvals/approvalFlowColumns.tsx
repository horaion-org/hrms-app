import type { TFunction } from "i18next";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import type { DataTableColumn } from "@/components/ui/DataTable";
import type { ApprovalFlow } from "@/features/approvals/api";
import { actionsColumn } from "@/features/organisation/listColumns";

const key = "approvals.flows";

/** Where a flow applies: its department, or the whole company. */
export const appliesToLabel = (
	flow: Pick<ApprovalFlow, "departmentId">,
	departmentName: (departmentId: string) => string | undefined,
	t: TFunction
): string =>
	flow.departmentId === null
		? t(`${key}.companyDefault`)
		: (departmentName(flow.departmentId) ?? t(`${key}.unknownDepartment`));

/** The steps in order as one line: "1 Endorse (all of 2) → 2 Publish". */
export const stepsSummary = (
	flow: Pick<ApprovalFlow, "steps">,
	t: TFunction
): string =>
	flow.steps
		.map((step) => {
			const allOf =
				step.rule === "MEMBERS" && step.quorum === "ALL"
					? ` (${t(`${key}.allOf`, { count: step.members.length })})`
					: "";
			return `${step.stepOrder} ${step.label}${allOf}`;
		})
		.join(" → ");

/**
 * Settings › Approvals' columns: where each flow applies, its steps, whether
 * it is on and, for those who may change flows, the row's Edit button and
 * menu (`actions`).
 */
export const approvalFlowColumns = (
	t: TFunction,
	departmentName: (departmentId: string) => string | undefined,
	actions?: {
		menu: (flow: ApprovalFlow) => ReactNode;
		onEdit: (flow: ApprovalFlow) => void;
	}
): Array<DataTableColumn<ApprovalFlow>> => [
	{
		id: "appliesTo",
		header: t(`${key}.appliesTo`),
		cell: (flow) => appliesToLabel(flow, departmentName, t),
		cellClassName: "font-semibold",
		pin: "start",
	},
	{
		id: "steps",
		header: t(`${key}.steps`),
		cell: (flow) => stepsSummary(flow, t),
		// Below xl (phones, and tablets and small laptops beside Settings' tabs) the steps read on the name's line.
		hideBelow: "xl",
	},
	{
		id: "status",
		header: t(`${key}.status`),
		cell: (flow) => (
			<Badge tone={flow.active ? "success" : "neutral"}>
				{t(flow.active ? `${key}.on` : `${key}.off`)}
			</Badge>
		),
		headerClassName: "w-30",
		// It joins the steps on the name's line below xl, so Edit and the row's menu stay on screen.
		hideBelow: "xl",
	},
	...(actions
		? [actionsColumn<ApprovalFlow>(t, actions.menu, () => true, actions.onEdit)]
		: []),
];
