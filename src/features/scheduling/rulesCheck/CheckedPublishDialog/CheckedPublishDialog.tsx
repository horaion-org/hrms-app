import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Callout } from "@/components/ui/Callout";
import {
	type CheckRead,
	gapsOf,
	holdsPublishBack,
	type LocksRead,
	PUBLISH_CHECK_WAIT_MS,
	peopleCountOf,
	type PublishCheck,
	publishCheckOf,
} from "@/features/scheduling/rulesCheck/publishCheck";
import {
	type BrokenRule,
	rosterRulesCheckQuery,
} from "@/features/scheduling/rulesCheck/rosterRulesCheckApi";
import { brokenRuleLabel } from "@/features/scheduling/rulesCheck/rosterRulesCheckWords";
import {
	rosterRunId,
	scheduleConstraintsQuery,
} from "@/features/scheduling/schedules/api";
import {
	PublishScheduleDialog,
	type PublishScheduleDialogProps,
} from "@/features/scheduling/schedules/PublishScheduleDialog";
import { departmentScope } from "@/features/workspace/scopes";
import { useAccess } from "@/features/workspace/useAccess";

/** Where the dialog is shown: the roster page, or the schedule's own page, where the roster is changed. */
export type PublishDialogPlace = "rosterPage" | "schedulePage";

/** The publish dialog's own props; the check supplies its note itself. */
export type CheckedPublishDialogProps = Omit<
	PublishScheduleDialogProps,
	"checkNote"
> & {
	/** Where it is shown, which words what to do about a broken locked rule; the roster page when left out. */
	shownOn?: PublishDialogPlace;
};

const key = "scheduling.rulesCheck.publishCheck";

/** The broken rules as a list: each by its name, with how many people it is broken for when the check says. */
const RuleList = ({
	rules,
}: {
	rules: ReadonlyArray<BrokenRule>;
}): FunctionComponent => {
	const { t } = useTranslation();
	return (
		<ul className="mt-2 list-disc pl-5">
			{rules.map((rule, index) => {
				const name = brokenRuleLabel(rule, t);
				const count = peopleCountOf(rule);
				return (
					// Two broken rules may share a name and an id, so the place in the list tells them apart.
					<li key={`${rule.rule}-${index}`}>
						{count > 0 ? t(`${key}.ruleLine`, { rule: name, count }) : name}
					</li>
				);
			})}
		</ul>
	);
};

/** What to do about a broken locked rule: from the roster page, where to change the roster; on the schedule page, only to change it. */
const LOCKED_NEXT_KEYS = {
	rosterPage: "scheduling.rulesCheck.publishCheck.lockedNext",
	schedulePage: "scheduling.rulesCheck.publishCheck.lockedNextHere",
} as const satisfies Record<PublishDialogPlace, string>;

/** What the check says, above the dialog's other warnings: nothing when every rule holds. */
const PublishCheckNote = ({
	check,
	shownOn,
}: {
	check: PublishCheck;
	shownOn: PublishDialogPlace;
}): FunctionComponent => {
	const { t } = useTranslation();
	if (check.kind === "checking")
		return (
			<p className="mb-6 text-sm text-neutral-800" role="status">
				{t(`${key}.checking`)}
			</p>
		);
	if (check.kind === "unchecked")
		return (
			<Callout className="mb-6" tone="warning">
				{t(`${key}.unchecked`)}
			</Callout>
		);
	if (check.kind === "holds") return null;
	return (
		<>
			{check.locked.length > 0 && (
				<Callout className="mb-6" tone="error">
					<p>{t(`${key}.lockedTitle`, { count: check.locked.length })}</p>
					<RuleList rules={check.locked} />
					<p className="mt-2">{t(LOCKED_NEXT_KEYS[shownOn])}</p>
				</Callout>
			)}
			{check.other.length > 0 && (
				<Callout className="mb-6" tone="warning">
					<p>{t(`${key}.warnTitle`, { count: check.other.length })}</p>
					<RuleList rules={check.other} />
				</Callout>
			)}
		</>
	);
};

/**
 * The publish dialog with the rules check run first (the roster page's
 * Validate schedule). A broken locked company rule holds Publish back and
 * says which; any other broken rule only warns; a check refused, unable to
 * tell or slower than 20 seconds warns and still lets the roster be published.
 */
export const CheckedPublishDialog = ({
	shownOn = "rosterPage",
	...props
}: CheckedPublishDialogProps): FunctionComponent => {
	const { companyId, schedule } = props;
	const access = useAccess();
	const [timedOut, setTimedOut] = useState(false);
	useEffect(() => {
		const timer = setTimeout(() => {
			setTimedOut(true);
		}, PUBLISH_CHECK_WAIT_MS);
		return (): void => {
			clearTimeout(timer);
		};
	}, []);
	const unit = {
		branchId: schedule.branchId,
		departmentId: schedule.departmentId,
	};
	const runId = rosterRunId(schedule);
	const hasRoster = runId !== undefined;
	const check = useQuery(
		rosterRulesCheckQuery(
			{
				companyId,
				unit,
				scheduleId: schedule.scheduleId,
				runId: runId ?? null,
			},
			schedule.rosterRevision,
			hasRoster
		)
	);
	const mayReadConstraints = access.can(
		"constraint:read",
		departmentScope(schedule.departmentId)
	);
	const constraints = useQuery(
		scheduleConstraintsQuery(
			companyId,
			unit,
			schedule.scheduleId,
			mayReadConstraints
		)
	);
	const checkRead: CheckRead =
		check.data ??
		(!hasRoster || check.isError || timedOut ? "unavailable" : "loading");
	const locksRead: LocksRead =
		constraints.data ??
		(!mayReadConstraints || constraints.isError || timedOut
			? "unavailable"
			: "loading");
	const result = publishCheckOf(checkRead, locksRead);
	// Held back by the caller (publishing is not offered) or by the check.
	const held = props.confirmDisabled === true || holdsPublishBack(result);
	return (
		<PublishScheduleDialog
			{...props}
			checkNote={<PublishCheckNote check={result} shownOn={shownOn} />}
			confirmDisabled={held}
			shortShifts={gapsOf(result) ?? props.shortShifts}
		/>
	);
};
