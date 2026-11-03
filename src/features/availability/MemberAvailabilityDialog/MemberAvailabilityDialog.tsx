import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import type { MemberWeek } from "@/features/availability/api";
import { AvailabilityDialog } from "@/features/availability/AvailabilityDialog";
import {
	weeklyWindowsOf,
	windowsOf,
	type AvailabilityScope,
	type WeeklyWindow,
} from "@/features/availability/availabilityModel";
import {
	useMemberAvailability,
	useReplaceMemberAvailability,
	useReplaceMemberWeekAvailability,
	useResetMemberWeekAvailability,
} from "@/features/availability/useAvailability";

export type MemberAvailabilityDialogProps = {
	companyId: string;
	/** The member's row of the shown week. */
	member: MemberWeek;
	/** The shown week, as its Monday. */
	weekStartMonday: string;
	onClose: () => void;
};

/**
 * Edits a colleague's availability from the team view, this week only or
 * every week. A week on the pattern shows the pattern itself, so it is read
 * only for a week with hours of its own; until then, or when it can't be
 * read, only the week can be changed. Saves straight away through the
 * member's routes.
 */
export const MemberAvailabilityDialog = ({
	companyId,
	member,
	weekStartMonday,
	onClose,
}: MemberAvailabilityDialogProps): FunctionComponent => {
	const { t } = useTranslation();
	const { membershipId } = member;
	const overridden = member.source === "OVERRIDE";
	const pattern = useMemberAvailability(companyId, membershipId, overridden);
	const replace = useReplaceMemberAvailability(companyId, membershipId);
	const replaceWeek = useReplaceMemberWeekAvailability(companyId, membershipId);
	const resetWeek = useResetMemberWeekAvailability(companyId, membershipId);

	const weekWindows = weeklyWindowsOf(member.windows);
	const patternWindows: Array<WeeklyWindow> | undefined = !overridden
		? weekWindows
		: pattern.status === "ready"
			? windowsOf(pattern.pattern)
			: undefined;
	const patternNote =
		pattern.status === "pending"
			? t("availability.dialog.patternLoading")
			: t("availability.patternFailed", { name: member.displayName });

	const save = (
		scope: AvailabilityScope,
		windows: Array<WeeklyWindow>
	): Promise<unknown> =>
		scope.kind === "week"
			? replaceWeek.mutateAsync({
					weekStartMonday: scope.weekStartMonday,
					request: { windows },
				})
			: replace.mutateAsync({ windows });

	return (
		<AvailabilityDialog
			name={member.displayName}
			overridden={overridden}
			patternNote={patternNote}
			patternWindows={patternWindows}
			weekStartMonday={weekStartMonday}
			weekWindows={weekWindows}
			onClose={onClose}
			onReset={() => resetWeek.mutateAsync(weekStartMonday)}
			onSubmit={save}
		/>
	);
};
