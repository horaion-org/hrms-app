import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { OverflowMenu, OverflowMenuItem } from "@/components/ui/OverflowMenu";
import type { MemberProfileDetail } from "@/features/people/api";
import { profileActionRefusal } from "@/features/people/profileRefusal";
import { useSetProfileStatus } from "@/features/people/useProfileActions";

export type ProfileMenuProps = {
	companyId: string;
	profile: MemberProfileDetail;
	/** The person is the one viewing, who can't deactivate themself. */
	self: boolean;
};

type DialogProps = {
	companyId: string;
	profile: MemberProfileDetail;
	onClose: () => void;
};

/** Deactivates or reactivates the person once asked, saying what that does. */
const ChangeStatus = ({
	companyId,
	profile,
	onClose,
}: DialogProps): FunctionComponent => {
	const { t } = useTranslation();
	const change = useSetProfileStatus(companyId, profile);
	const action = profile.status === "ACTIVE" ? "deactivate" : "reactivate";
	const key = `people.profile.${action}` as const;
	const name = profile.displayName;
	return (
		<ConfirmDialog
			cancelLabel={t("organisation.list.cancel")}
			confirmLabel={t(`${key}.confirm`)}
			description={t(`${key}.description`, { name })}
			error={change.error ? profileActionRefusal(change.error, t) : undefined}
			submitting={change.isPending}
			title={t(`${key}.title`, { name })}
			onClose={onClose}
			onConfirm={() => {
				change.mutate(action === "deactivate" ? "INACTIVE" : "ACTIVE", {
					onSuccess: onClose,
				});
			}}
		/>
	);
};

/**
 * A person's "More actions" menu: deactivate or reactivate them. Only what
 * applies is offered; with nothing to offer there is no menu. Shown only to
 * someone who may change the person: see `profileEditAccess`.
 */
export const ProfileMenu = ({
	companyId,
	profile,
	self,
}: ProfileMenuProps): FunctionComponent => {
	const { t } = useTranslation();
	const [open, setOpen] = useState<"status">();
	const close = (): void => {
		setOpen(undefined);
	};
	const active = profile.status === "ACTIVE";
	const canChangeStatus = !(active && self);
	if (!canChangeStatus) return null;

	return (
		<>
			<OverflowMenu
				label={t("people.profile.moreActions", { name: profile.displayName })}
				variant="icon"
			>
				{canChangeStatus && (
					<OverflowMenuItem
						onClick={() => {
							setOpen("status");
						}}
					>
						{t(
							active
								? "people.profile.deactivate.item"
								: "people.profile.reactivate.item"
						)}
					</OverflowMenuItem>
				)}
			</OverflowMenu>
			{open === "status" && (
				<ChangeStatus companyId={companyId} profile={profile} onClose={close} />
			)}
		</>
	);
};
