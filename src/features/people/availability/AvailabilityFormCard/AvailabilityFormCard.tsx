import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import type {
	EmploymentType,
	MemberProfileDetail,
} from "@/features/people/api";
import { memberAvailabilityQuery } from "@/features/people/availability/api";
import { AvailabilityCard } from "@/features/people/availability/AvailabilityCard";
import { AvailabilityDialog } from "@/features/people/availability/AvailabilityDialog";
import {
	isPartTime,
	windowsOf,
	type WeeklyWindow,
} from "@/features/people/availability/availabilityModel";
import {
	availabilityReadAccess,
	isRefused,
} from "@/features/people/profileEditAccess";
import { useAccess } from "@/features/workspace/useAccess";

export type AvailabilityFormCardProps = {
	companyId: string;
	profile: MemberProfileDetail;
	/** The employment type as chosen on the page, which may not be saved yet. */
	employmentType: EmploymentType | "";
	/** The pattern as changed on the page; undefined while unchanged. Saved with the profile. */
	draft: ReadonlyArray<WeeklyWindow> | undefined;
	onDraftChange: (windows: Array<WeeklyWindow>) => void;
	className?: string;
};

/**
 * A person's availability while their profile is being edited: shown once
 * Part-time is chosen, and hidden again, keeping what the API has, when
 * another type is. Changes made in the dialog are held in `draft` until the
 * page saves.
 */
export const AvailabilityFormCard = ({
	companyId,
	profile,
	employmentType,
	draft,
	onDraftChange,
	className,
}: AvailabilityFormCardProps): FunctionComponent => {
	const { t } = useTranslation();
	const { can } = useAccess();
	const [editing, setEditing] = useState(false);
	const shown =
		isPartTime(employmentType) && availabilityReadAccess(profile, can);
	const loaded = useQuery(
		memberAvailabilityQuery(companyId, profile.membershipId, shown)
	);
	if (!shown || isRefused(loaded.error)) return null;
	const windows = draft ?? (loaded.data && windowsOf(loaded.data));

	return (
		<>
			<AvailabilityCard
				className={className}
				emptyMessage={t("people.availability.empty")}
				failed={!draft && loaded.isError}
				windows={windows}
				action={
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
					onClose={() => {
						setEditing(false);
					}}
					onSubmit={(next) => {
						onDraftChange(next);
						return Promise.resolve();
					}}
				/>
			)}
		</>
	);
};
