import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import type { MemberProfileDetail } from "@/features/people/api";

export type ProfileHeaderProps = {
	profile: Pick<
		MemberProfileDetail,
		| "displayName"
		| "employeeCode"
		| "jobTitleName"
		| "status"
	>;
	/** Placed at the right, e.g. "Edit profile" and the "More actions" menu. */
	actions?: ReactNode;
};

/**
 * The top of a person's page: their initials, name as the page's heading,
 * status, and their employee ID and job title.
 */
export const ProfileHeader = ({
	profile,
	actions,
}: ProfileHeaderProps): FunctionComponent => {
	const { t } = useTranslation();
	return (
		<div className="flex flex-wrap items-center justify-between gap-6">
			<div className="flex min-w-0 items-center gap-5">
				{/* The heading beside it already says who this is. */}
				<Avatar
					aria-hidden
					className="size-20 text-3xl"
					name={profile.displayName}
				/>
				<div className="min-w-0">
					<div className="flex flex-wrap items-center gap-3">
						<h1 className="min-w-0 text-3xl font-medium break-words text-neutral-900">
							{profile.displayName}
						</h1>
						<Badge tone={profile.status === "ACTIVE" ? "success" : "neutral"}>
							{t(`organisation.status.${profile.status}`)}
						</Badge>
					</div>
					<p className="mt-2 flex flex-wrap items-center gap-2 text-base text-neutral-800">
						<span>{profile.employeeCode}</span>
						{profile.jobTitleName && (
							<>
								<span aria-hidden="true">•</span>
								<span>{profile.jobTitleName}</span>
							</>
						)}
					</p>
				</div>
			</div>
			{actions && (
				<div className="flex flex-wrap items-center gap-3">{actions}</div>
			)}
		</div>
	);
};
