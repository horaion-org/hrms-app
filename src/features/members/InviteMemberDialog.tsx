import { useState } from "react";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { useInviteMemberMutation } from "@/features/members/useMembersQuery";
import { useWorkspace } from "@/features/session/workspace-context";

type InviteMemberDialogProps = {
	open: boolean;
	onClose: () => void;
};

export const InviteMemberDialog = ({
	open,
	onClose,
}: InviteMemberDialogProps): FunctionComponent => {
	const { companyId } = useWorkspace();
	const invite = useInviteMemberMutation(companyId);
	const [email, setEmail] = useState("");
	const [displayName, setDisplayName] = useState("");

	const submit = (): void => {
		invite.mutate(
			{ email, displayName },
			{
				onSuccess: () => {
					setEmail("");
					setDisplayName("");
					onClose();
				},
			}
		);
	};

	return (
		<Dialog
			description="They will receive an email with a temporary password and set their own on first sign-in."
			open={open}
			title="Invite a member"
			onClose={onClose}
		>
			<form
				className="space-y-4"
				onSubmit={(event) => {
					event.preventDefault();
					submit();
				}}
			>
				<Input
					required
					autoComplete="email"
					label="Email address"
					type="email"
					value={email}
					onChange={(event) => {
						setEmail(event.target.value);
					}}
				/>
				<Input
					hint="Optional. We will show their email address until they set one."
					label="Name"
					maxLength={255}
					value={displayName}
					onChange={(event) => {
						setDisplayName(event.target.value);
					}}
				/>
				<div className="flex justify-end gap-2">
					<Button variant="secondary" onClick={onClose}>
						Cancel
					</Button>
					<Button loading={invite.isPending} type="submit">
						Send invitation
					</Button>
				</div>
			</form>
		</Dialog>
	);
};
