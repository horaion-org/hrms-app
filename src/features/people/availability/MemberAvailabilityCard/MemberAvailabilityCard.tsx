import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import type { MemberProfileDetail } from "@/features/people/api";
import { memberAvailabilityQuery } from "@/features/people/availability/api";
import { AvailabilityCard } from "@/features/people/availability/AvailabilityCard";
import { AvailabilityDialog } from "@/features/people/availability/AvailabilityDialog";
import {
	hasOverride,
	isPartTime,
	PATTERN_SCOPE,
	type AvailabilityScope,
	type WeeklyWindow,
} from "@/features/people/availability/availabilityModel";
import {
	useEffectiveAvailability,
	useReplaceMemberAvailability,
	useReplaceMemberWeekAvailability,
	useResetMemberWeekAvailability,
} from "@/features/people/availability/useAvailability";
import { WeekSelector } from "@/features/people/availability/WeekSelector";
import {
	availabilityReadAccess,
	isRefused,
} from "@/features/people/profileEditAccess";
import { useAccess } from "@/features/workspace/useAccess";

export type MemberAvailabilityCardProps = {
	companyId: string;
	profile: MemberProfileDetail;
	/** Whether the person viewing may change it, as they may the profile; false leaves it read-only. */
	changeable: boolean;
	className?: string;
};

/**
 * A colleague's availability on their profile, only when they are
 * part-time and the workspace lets it be read; nothing at all otherwise,
 * or when the API refuses it. The default pattern or one of the coming
 * weeks is shown, and "Edit availability" changes what is shown, saving
 * straight away.
 */
export const MemberAvailabilityCard = ({
	companyId,
	profile,
	changeable,
	className,
}: MemberAvailabilityCardProps): FunctionComponent => {
	const { t } = useTranslation();
	const { can } = useAccess();
	const { membershipId } = profile;
	const [scope, setScope] = useState<AvailabilityScope>(PATTERN_SCOPE);
	const [editing, setEditing] = useState(false);
	const shown =
		isPartTime(profile.employmentType) && availabilityReadAccess(profile, can);
	const loaded = useQuery(
		memberAvailabilityQuery(companyId, membershipId, shown)
	);
	const { windows, failed } = useEffectiveAvailability(
		companyId,
		{ kind: "member", membershipId },
		loaded.data,
		scope
	);
	const replace = useReplaceMemberAvailability(companyId, membershipId);
	const replaceWeek = useReplaceMemberWeekAvailability(companyId, membershipId);
	const resetWeek = useResetMemberWeekAvailability(companyId, membershipId);
	if (!shown || isRefused(loaded.error)) return null;
	const overrideWeeks = loaded.data?.overrideWeeks ?? [];

	const save = (next: Array<WeeklyWindow>): Promise<unknown> =>
		scope.kind === "week"
			? replaceWeek.mutateAsync({
					weekStartMonday: scope.weekStartMonday,
					request: { windows: next },
				})
			: replace.mutateAsync({ windows: next });
	const reset =
		scope.kind === "week" && hasOverride(scope, overrideWeeks)
			? (): Promise<unknown> => resetWeek.mutateAsync(scope.weekStartMonday)
			: undefined;

	return (
		<>
			<AvailabilityCard
				className={className}
				failed={loaded.isError || failed}
				windows={windows}
				action={
					changeable &&
					windows && (
						<Button
							variant="hyperlink"
							onClick={() => {
								setEditing(true);
							}}
						>
							{t("people.availability.edit")}
						</Button>
					)
				}
				titleAside={
					loaded.data && (
						<WeekSelector
							overrideWeeks={overrideWeeks}
							scope={scope}
							onChange={setScope}
						/>
					)
				}
			/>
			{editing && windows && (
				<AvailabilityDialog
					name={profile.displayName}
					scope={scope}
					windows={windows}
					onReset={reset}
					onSubmit={save}
					onClose={() => {
						setEditing(false);
					}}
				/>
			)}
		</>
	);
};
