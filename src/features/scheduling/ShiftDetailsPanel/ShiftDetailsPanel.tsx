import dayjs from "dayjs";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CloseIcon, DeleteIcon } from "@/components/ui/Icon";
import { formatTimeRange } from "@/features/scheduling/formatShift";
import type { RosterShift } from "@/features/scheduling/schedules";

export type ShiftDetailsPanelProps = {
	staffName: string;
	shift: RosterShift;
	/** Offers the shift's actions; a published schedule is read-only. */
	editable: boolean;
	onClose: () => void;
	onDelete: (shift: RosterShift) => void;
	className?: string;
};

const key = "scheduling.detail.shiftDetails";

/**
 * One shift beside the roster: who, when, where, and any notes. Editing,
 * reassigning and duplicating wait for the scheduling API, so only Delete
 * works for now.
 */
export const ShiftDetailsPanel = ({
	staffName,
	shift,
	editable,
	onClose,
	onDelete,
	className,
}: ShiftDetailsPanelProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const titleId = useId();
	const language = i18n.resolvedLanguage ?? i18n.language;
	const open = shift.kind === "open";
	const date = new Intl.DateTimeFormat(language, {
		weekday: "short",
		day: "numeric",
		month: "short",
		year: "numeric",
	}).format(dayjs(shift.date).toDate());
	const details = [
		{ label: t(`${key}.date`), value: date },
		{
			label: t(`${key}.time`),
			value: formatTimeRange({ startTime: shift.start, endTime: shift.end }, t),
		},
		{
			label: t(`${key}.break`),
			value:
				shift.breakMinutes === 0
					? t(`${key}.noBreak`)
					: t(`${key}.breakMinutes`, { count: shift.breakMinutes }),
		},
		{ label: t(`${key}.role`), value: shift.role },
		{ label: t(`${key}.location`), value: shift.location },
	];

	return (
		<aside
			aria-labelledby={titleId}
			className={joinClassNames("w-full shrink-0 lg:w-63", className)}
		>
			<div className="overflow-hidden rounded-lg border border-neutral-400 divide-y divide-neutral-400">
				<div className="flex h-14 items-center justify-between px-4">
					<h2 className="font-bold text-neutral-900" id={titleId}>
						{t(`${key}.title`)}
					</h2>
					<Button
						aria-label={t(`${key}.close`)}
						variant="icon"
						onClick={onClose}
					>
						<CloseIcon />
					</Button>
				</div>
				<div className="px-4 py-4">
					<div className="flex items-center gap-3">
						<Avatar className="size-10! text-base!" name={staffName} />
						<span className="font-semibold text-neutral-900">{staffName}</span>
					</div>
					<Badge className="mt-5 uppercase" tone={open ? "error" : "success"}>
						{open ? t(`${key}.open`) : t(`${key}.assigned`)}
					</Badge>
				</div>
				<dl className="flex flex-col gap-4 px-4 py-4 text-sm">
					{details.map(({ label, value }) => (
						<div
							key={label}
							className="flex items-center justify-between gap-3"
						>
							<dt className="font-medium text-neutral-800">{label}</dt>
							<dd className="text-right font-semibold text-neutral-900">
								{value}
							</dd>
						</div>
					))}
				</dl>
				{shift.notes && (
					<div className="px-4 py-4 text-sm">
						<h3 className="font-semibold text-neutral-800">
							{t(`${key}.notes`)}
						</h3>
						<p className="mt-3 font-semibold text-neutral-900">{shift.notes}</p>
					</div>
				)}
			</div>
			{editable && (
				<div className="mt-6 flex flex-col gap-4">
					<Button disabled size="sm" variant="secondary">
						{t(`${key}.edit`)}
					</Button>
					<Button disabled size="sm" variant="secondary">
						{t(`${key}.reassign`)}
					</Button>
					<Button disabled size="sm" variant="secondary">
						{t(`${key}.duplicate`)}
					</Button>
					<Button
						className="border-error-200! bg-error-50! text-error-600!"
						leadingIcon={<DeleteIcon />}
						size="sm"
						variant="secondary"
						onClick={() => {
							onDelete(shift);
						}}
					>
						{t(`${key}.delete`)}
					</Button>
				</div>
			)}
		</aside>
	);
};
