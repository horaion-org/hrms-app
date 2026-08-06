import { useState } from "react";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { useImportMembersMutation } from "@/features/members/useMembersQuery";
import { useWorkspace } from "@/features/session/workspace-context";

type ImportMembersDialogProps = {
	open: boolean;
	onClose: () => void;
};

export const ImportMembersDialog = ({
	open,
	onClose,
}: ImportMembersDialogProps): FunctionComponent => {
	const { companyId } = useWorkspace();
	const importMembers = useImportMembersMutation(companyId);
	const [file, setFile] = useState<File | null>(null);

	const submit = (): void => {
		if (file === null) {
			return;
		}

		importMembers.mutate(file, {
			onSuccess: () => {
				setFile(null);
				onClose();
			},
		});
	};

	return (
		<Dialog
			description="The whole file is validated before anything is created. Rows naming an email that already exists are skipped, never merged."
			open={open}
			title="Import members"
			onClose={onClose}
		>
			<form
				className="space-y-4"
				onSubmit={(event) => {
					event.preventDefault();
					submit();
				}}
			>
				<div className="space-y-1">
					<label
						className="block text-sm font-medium text-slate-900"
						htmlFor="member-import-file"
					>
						Spreadsheet
					</label>
					<input
						required
						accept=".xlsx"
						className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-sm file:text-white"
						id="member-import-file"
						type="file"
						onChange={(event) => {
							setFile(event.target.files?.[0] ?? null);
						}}
					/>
				</div>
				<div className="flex justify-end gap-2">
					<Button variant="secondary" onClick={onClose}>
						Cancel
					</Button>
					<Button
						disabled={file === null}
						loading={importMembers.isPending}
						type="submit"
					>
						Import
					</Button>
				</div>
			</form>
		</Dialog>
	);
};
