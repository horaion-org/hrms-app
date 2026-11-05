import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import type { MemberProfileDetail } from "@/features/people/api";
import { NotesCard, type NotesCardProps } from "@/features/people/NotesCard";
import { SkillsCard } from "@/features/people/SkillsCard";

export type ProfileNotesAndSkillsProps = {
	companyId: string;
	profile: MemberProfileDetail;
	/** Whether the person viewing may change their skills; see `SkillsCard`. */
	skillsChangeable: boolean;
	/** Read mode keeps each note's actions in a menu; edit mode shows buttons. */
	noteActions: NotesCardProps["actions"];
	className?: string;
};

/**
 * The bottom row of a person's page: their notes, for those who may read
 * them, beside their skills, laid out like the profile's cards above.
 */
export const ProfileNotesAndSkills = ({
	companyId,
	profile,
	skillsChangeable,
	noteActions,
	className,
}: ProfileNotesAndSkillsProps): FunctionComponent => (
	<div className={joinClassNames("grid gap-6 xl:grid-cols-2", className)}>
		<NotesCard actions={noteActions} companyId={companyId} profile={profile} />
		<SkillsCard
			changeable={skillsChangeable}
			companyId={companyId}
			profile={profile}
		/>
	</div>
);
