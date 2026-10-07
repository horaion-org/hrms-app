import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { OverflowMenu, OverflowMenuItem } from "@/components/ui/OverflowMenu";
import type { MemberProfileDetail } from "@/features/people/api";
import { profileActionRefusal } from "@/features/people/profileRefusal";
import {
	useResendInvitation,
	useSetProfileStatus,
} from "@/features/people/useProfileActions";

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

/** Emails the person a new invitation to log in, once asked. */
const ResendInvitation = ({
	companyId,
	profile,
	onClose,
}: DialogProps): FunctionComponent => {
	const { t } = useTranslation();
	const resend = useResendInvitation(companyId, profile);
	const key = "people.profile.resend";
	return (
		<ConfirmDialog
			cancelLabel={t("organisation.list.cancel")}
			confirmLabel={t(`${key}.confirm`)}
			description={t(`${key}.description`, { email: profile.email })}
			error={resend.error ? profileActionRefusal(resend.error, t) : undefined}
			submitting={resend.isPending}
			title={t(`${key}.title`, { name: profile.displayName })}
			onClose={onClose}
			onConfirm={() => {
				resend.mutate(undefined, { onSuccess: onClose });
			}}
		/>
	);
};

/**
 * A person's "More actions" menu: deactivate or reactivate them, and resend
 * their invitation while they have yet to log in. Only what applies is
 * offered; with nothing to offer there is no menu. Shown only to someone who
 * may change the person: see `profileEditAccess`.
 */
export const ProfileMenu = ({
	companyId,
	profile,
	self,
}: ProfileMenuProps): FunctionComponent => {
	const { t } = useTranslation();
	const [open, setOpen] = useState<"status" | "invitation">();
	const close = (): void => {
		setOpen(undefined);
	};
	const active = profile.status === "ACTIVE";
	const canChangeStatus = !(active && self);
	const canResend = profile.invitationPending === true;
	if (!canChangeStatus && !canResend) return null;

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
				{canResend && (
					<OverflowMenuItem
						onClick={() => {
							setOpen("invitation");
						}}
					>
						{t("people.profile.resend.item")}
					</OverflowMenuItem>
				)}
			</OverflowMenu>
			{open === "status" && (
				<ChangeStatus companyId={companyId} profile={profile} onClose={close} />
			)}
			{open === "invitation" && (
				<ResendInvitation
					companyId={companyId}
					profile={profile}
					onClose={close}
				/>
			)}
		</>
	);
};
