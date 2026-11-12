import { useId, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { AlertFilledIcon, TickFilledIcon } from "@/components/ui/Icon";
import type { MonthGenerationCheck } from "@/features/scheduling/months/api";
import { formatMonthName } from "@/features/scheduling/months/monthWeeks";

/** A link a line offers, drawn by the page with the label the panel chose. */
export type PanelLink = (label: string) => ReactNode;

export type BeforeGeneratePanelProps = {
	/** What the API says the Department needs, and its leave in the month. */
	check: MonthGenerationCheck;
	/** The month, as "yyyy-MM". */
	month: string;
	/** Why Generate waits besides readiness (lists unreadable, no schedule:create); undefined when it may run. */
	blockedNote?: string;
	/** Generate waits without a note: the lists it needs are still loading. */
	waiting?: boolean;
	/** The fix links, each only where the person may follow it. */
	links?: { shifts?: PanelLink; constraints?: PanelLink; leave?: PanelLink };
	/** The month's generation is being requested. */
	generating: boolean;
	onGenerate: () => void;
	className?: string;
};

type Look = "ok" | "warning" | "blocked";

const key = "scheduling.months.generate.panel";

/** A line's mark: its shape and colour say ok, worth a look or blocking; the words say it again. */
const Mark = ({ look }: { look: Look }): FunctionComponent =>
	look === "ok" ? (
		<TickFilledIcon
			aria-hidden="true"
			className="size-5 shrink-0 text-success-900"
		/>
	) : (
		<AlertFilledIcon
			aria-hidden="true"
			className={joinClassNames(
				"size-5 shrink-0",
				look === "warning" ? "text-warning-900" : "text-error-900"
			)}
		/>
	);

/** One line: its mark, its title, what it says and the link it offers. */
const Line = ({
	look,
	title,
	text,
	link,
}: {
	look: Look;
	title: string;
	text: string;
	link?: ReactNode;
}): FunctionComponent => (
	<li className="flex items-start gap-3">
		<Mark look={look} />
		<span className="min-w-0 text-sm text-neutral-900">
			<strong>{title}</strong> {text} {link}
		</span>
	</li>
);

/**
 * "Before you generate November": what the Department needs before its month
 * is generated. Shifts and Staffing block Generate when missing; Leave only
 * warns, when no leave is approved in the month, and says how many requests
 * still wait. Generate is disabled, with the reason under it, while anything
 * blocks; `blockedNote` adds a reason the page knows (no schedule:create, or
 * lists it can't read).
 */
export const BeforeGeneratePanel = ({
	check,
	month,
	blockedNote,
	waiting = false,
	links = {},
	generating,
	onGenerate,
	className,
}: BeforeGeneratePanelProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const titleId = useId();
	const noteId = useId();
	const language = formattingLocale(i18n);
	const monthName = formatMonthName(month, language);
	const department = check.departmentName;
	const hasShift = check.shiftCount > 0;
	const staffing = check.staffingConstraint;
	const approved = check.peopleWithApprovedLeave;
	const waitingRequests =
		check.leaveRequestsWaiting > 0
			? t(approved > 0 ? `${key}.waitingMore` : `${key}.waiting`, {
					count: check.leaveRequestsWaiting,
				})
			: "";
	const readinessNote = !hasShift
		? t(`${key}.blockedShift`, { department })
		: staffing === null
			? t(`${key}.blockedStaffing`, { department })
			: undefined;
	const note = readinessNote ?? blockedNote;

	return (
		<section
			aria-labelledby={titleId}
			className={joinClassNames(
				"flex flex-col gap-4 rounded-xl border border-neutral-400 bg-white p-6",
				className
			)}
		>
			<h2 className="text-lg font-medium text-neutral-900" id={titleId}>
				{t(`${key}.title`, { month: monthName })}
			</h2>
			<ul className="flex flex-col gap-3">
				<Line
					look={hasShift ? "ok" : "blocked"}
					title={t(`${key}.shiftsTitle`)}
					link={links.shifts?.(
						t(hasShift ? `${key}.editShifts` : `${key}.addShift`)
					)}
					text={
						hasShift
							? t(`${key}.shifts`, { department, count: check.shiftCount })
							: t(`${key}.noShifts`, { department })
					}
				/>
				<Line
					look={staffing ? "ok" : "blocked"}
					title={t(`${key}.staffingTitle`)}
					link={links.constraints?.(
						t(staffing ? `${key}.editConstraints` : `${key}.addStaffing`)
					)}
					text={
						staffing
							? t(`${key}.staffing`, {
									name: staffing.name,
									shifts: new Intl.ListFormat(language, {
										type: "conjunction",
									}).format(staffing.shiftNames),
								})
							: t(`${key}.noStaffing`)
					}
				/>
				<Line
					link={links.leave?.(t(`${key}.openLeave`))}
					look={approved > 0 ? "ok" : "warning"}
					title={t(`${key}.leaveTitle`)}
					text={[
						approved > 0
							? t(`${key}.approvedLeave`, { count: approved, month: monthName })
							: t(`${key}.noApprovedLeave`, { month: monthName }),
						waitingRequests,
					]
						.filter(Boolean)
						.join(" ")}
				/>
			</ul>
			<div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-neutral-400 pt-4">
				<p className="min-w-0 flex-1 basis-80 text-sm text-neutral-800">
					{t(`${key}.hint`, { month: monthName })}
				</p>
				<div className="flex flex-col items-end gap-1 max-sm:w-full">
					<Button
						aria-describedby={note ? noteId : undefined}
						className="max-sm:w-full"
						disabled={note !== undefined || waiting}
						loading={generating}
						onClick={onGenerate}
					>
						{t(`${key}.generate`, { month: monthName })}
					</Button>
					{note && (
						<p className="text-sm text-neutral-800" id={noteId}>
							{note}
						</p>
					)}
				</div>
			</div>
		</section>
	);
};
