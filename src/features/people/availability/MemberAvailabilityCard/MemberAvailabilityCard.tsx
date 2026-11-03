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
	isPartTime,
	windowsOf,
} from "@/features/people/availability/availabilityModel";
import { useReplaceMemberAvailability } from "@/features/people/availability/useAvailability";
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
 * A colleague's weekly availability on their profile, only when they are
 * part-time and the workspace lets it be read; nothing at all otherwise,
 * or when the API refuses it. "Edit availability" saves straight away.
 */
export const MemberAvailabilityCard = ({
	companyId,
	profile,
	changeable,
	className,
}: MemberAvailabilityCardProps): FunctionComponent => {
	const { t } = useTranslation();
	const { can } = useAccess();
	const [editing, setEditing] = useState(false);
	const shown =
		isPartTime(profile.employmentType) && availabilityReadAccess(profile, can);
	const loaded = useQuery(
		memberAvailabilityQuery(companyId, profile.membershipId, shown)
	);
	const replace = useReplaceMemberAvailability(companyId, profile.membershipId);
	if (!shown || isRefused(loaded.error)) return null;
	const windows = loaded.data && windowsOf(loaded.data);

	return (
		<>
			<AvailabilityCard
				className={className}
				failed={loaded.isError}
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
			/>
			{editing && windows && (
				<AvailabilityDialog
					name={profile.displayName}
					windows={windows}
					onSubmit={(next) => replace.mutateAsync({ windows: next })}
					onClose={() => {
						setEditing(false);
					}}
				/>
			)}
		</>
	);
};
