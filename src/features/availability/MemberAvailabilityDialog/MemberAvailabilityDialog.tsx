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
	/** The shown week, opened with the row's windows, or the member's default pattern. */
	scope: AvailabilityScope;
	onClose: () => void;
};

/**
 * Edits a colleague's availability from the team view: the shown week,
 * starting from what is in force that week and resettable when it has
 * hours of its own, or their default pattern, read when opened. Saves
 * straight away through the member's routes. Nothing is drawn while the
 * pattern loads, or when it could not be read.
 */
export const MemberAvailabilityDialog = ({
	companyId,
	member,
	scope,
	onClose,
}: MemberAvailabilityDialogProps): FunctionComponent => {
	const { membershipId } = member;
	const pattern = useMemberAvailability(
		companyId,
		membershipId,
		scope.kind === "pattern"
	);
	const replace = useReplaceMemberAvailability(companyId, membershipId);
	const replaceWeek = useReplaceMemberWeekAvailability(companyId, membershipId);
	const resetWeek = useResetMemberWeekAvailability(companyId, membershipId);

	const windows: Array<WeeklyWindow> | undefined =
		scope.kind === "week"
			? weeklyWindowsOf(member.windows)
			: pattern.status === "ready"
				? windowsOf(pattern.pattern)
				: undefined;
	if (!windows) return null;

	const save = (next: Array<WeeklyWindow>): Promise<unknown> =>
		scope.kind === "week"
			? replaceWeek.mutateAsync({
					weekStartMonday: scope.weekStartMonday,
					request: { windows: next },
				})
			: replace.mutateAsync({ windows: next });
	const reset =
		scope.kind === "week" && member.source === "OVERRIDE"
			? (): Promise<unknown> => resetWeek.mutateAsync(scope.weekStartMonday)
			: undefined;

	return (
		<AvailabilityDialog
			name={member.displayName}
			scope={scope}
			windows={windows}
			onClose={onClose}
			onReset={reset}
			onSubmit={save}
		/>
	);
};
