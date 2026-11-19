import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { OverflowMenu, OverflowMenuItem } from "@/components/ui/OverflowMenu";
import { defaultAccessRefusal } from "@/features/organisation/defaultAccessRefusal";
import {
	defaultAccessRecipientQuery,
	useGiveDefaultAccess,
	useStopDefaultAccess,
} from "@/features/organisation/useDefaultAccess";
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
	/**
	 * The reader may give or stop default access (API ADR-0118):
	 * `access_role:assign` at the whole company. Left out, nothing about
	 * default access is asked or offered.
	 */
	canChangeDefaultAccess?: boolean;
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
 * Gives the person default access, or stops it, once asked, saying what
 * that does; a refusal says what to do.
 */
const ChangeDefaultAccess = ({
	companyId,
	profile,
	receives,
	onClose,
}: DialogProps & { receives: boolean }): FunctionComponent => {
	const { t } = useTranslation();
	const give = useGiveDefaultAccess(companyId);
	const stop = useStopDefaultAccess(companyId);
	const change = receives ? stop : give;
	const key =
		`people.profile.defaultAccess.${receives ? "stop" : "give"}` as const;
	const name = profile.displayName;
	return (
		<ConfirmDialog
			cancelLabel={t("organisation.list.cancel")}
			confirmLabel={t(`${key}.confirm`)}
			description={t(`${key}.description`, { name })}
			error={change.error ? defaultAccessRefusal(change.error, t) : undefined}
			submitting={change.isPending}
			title={t(`${key}.title`, { name })}
			onClose={onClose}
			onConfirm={() => {
				if (receives) stop.mutate(profile.membershipId, { onSuccess: onClose });
				else give.mutate([profile.membershipId], { onSuccess: onClose });
			}}
		/>
	);
};

/**
 * A person's "More actions" menu: deactivate or reactivate them, resend
 * their invitation while they have yet to log in, and give or stop their
 * default access for someone who may change access. Only what applies is
 * offered; with nothing to offer there is no menu. Shown only to someone who
 * may change the person: see `profileEditAccess`.
 */
export const ProfileMenu = ({
	companyId,
	profile,
	self,
	canChangeDefaultAccess = false,
}: ProfileMenuProps): FunctionComponent => {
	const { t } = useTranslation();
	const [open, setOpen] = useState<"status" | "invitation" | "defaultAccess">();
	const recipient = useQuery(
		defaultAccessRecipientQuery(
			companyId,
			profile.membershipId,
			canChangeDefaultAccess
		)
	);
	const close = (): void => {
		setOpen(undefined);
	};
	const active = profile.status === "ACTIVE";
	const canChangeStatus = !(active && self);
	const canResend = profile.invitationPending === true;
	const receives = recipient.data?.receivesDefaultAccess;
	// Only an active person can be given it; anyone receiving it can be stopped.
	const canChangeDefault = receives === true || (receives === false && active);
	if (!canChangeStatus && !canResend && !canChangeDefault) return null;

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
				{canChangeDefault && (
					<OverflowMenuItem
						onClick={() => {
							setOpen("defaultAccess");
						}}
					>
						{t(
							receives
								? "people.profile.defaultAccess.stop.item"
								: "people.profile.defaultAccess.give.item"
						)}
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
			{open === "defaultAccess" && receives !== undefined && (
				<ChangeDefaultAccess
					companyId={companyId}
					profile={profile}
					receives={receives}
					onClose={close}
				/>
			)}
		</>
	);
};
