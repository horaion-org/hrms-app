import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { NotesIcon } from "@/components/ui/Icon";
import type { MemberNote, MemberProfileDetail } from "@/features/people/api";
import { NoteDialog } from "@/features/people/NoteDialog";
import { NoteItem, type NoteItemProps } from "@/features/people/NoteItem";
import { noteAccess, noteDeleteRefusal } from "@/features/people/notes";
import { isRefused } from "@/features/people/profileEditAccess";
import { useDeleteNote, useMemberNotes } from "@/features/people/useNotes";
import { useCan } from "@/features/workspace/useCan";

export type NotesCardProps = {
	companyId: string;
	profile: MemberProfileDetail;
	/** How each note offers its actions: a menu when read, buttons when editing. */
	actions: NoteItemProps["actions"];
	className?: string;
};

const key = "people.notes";

/** Deletes a note once asked. */
const DeleteNote = ({
	companyId,
	profile,
	note,
	onClose,
}: {
	companyId: string;
	profile: MemberProfileDetail;
	note: MemberNote;
	onClose: () => void;
}): FunctionComponent => {
	const { t } = useTranslation();
	const remove = useDeleteNote(companyId, profile.membershipId);
	return (
		<ConfirmDialog
			cancelLabel={t(`${key}.dialog.cancel`)}
			confirmLabel={t(`${key}.delete.confirm`)}
			error={remove.error ? noteDeleteRefusal(remove.error, t) : undefined}
			submitting={remove.isPending}
			title={t(`${key}.delete.title`)}
			description={t(`${key}.delete.description`, {
				name: profile.displayName,
			})}
			onClose={onClose}
			onConfirm={() => {
				remove.mutate(note.noteId, { onSuccess: onClose });
			}}
		/>
	);
};

/**
 * A person's notes, newest first, with their count, for someone who may
 * read them; otherwise nothing is drawn or asked for, and nothing is drawn
 * when the API refuses them either. More are loaded on request and the list
 * scrolls inside the card. Adding, editing and deleting are each offered
 * only with their key where the person is (see `noteAccess`).
 */
export const NotesCard = ({
	companyId,
	profile,
	actions,
	className,
}: NotesCardProps): FunctionComponent => {
	const { t } = useTranslation();
	const access = noteAccess(profile, useCan());
	const notes = useMemberNotes(companyId, profile.membershipId, access.read);
	const [open, setOpen] = useState<
		| { kind: "add" }
		| { kind: "edit"; note: MemberNote }
		| { kind: "delete"; note: MemberNote }
	>();
	const close = (): void => {
		setOpen(undefined);
	};
	if (!access.read || isRefused(notes.error)) return null;
	const total = notes.data?.pages[0]?.total;
	const items = notes.data?.pages.flatMap((page) => page.items) ?? [];

	return (
		<Card
			className={className}
			icon={NotesIcon}
			action={
				access.create && (
					<Button
						variant="hyperlink"
						onClick={() => {
							setOpen({ kind: "add" });
						}}
					>
						{t(`${key}.add`)}
					</Button>
				)
			}
			title={
				total === undefined
					? t(`${key}.title`)
					: t(`${key}.titleCount`, { count: total })
			}
		>
			{notes.isPending && (
				<p className="text-sm text-neutral-700">{t(`${key}.loading`)}</p>
			)}
			{notes.isError && (
				<p className="text-sm text-error-700" role="alert">
					{t(`${key}.failed`)}
				</p>
			)}
			{notes.isSuccess && items.length === 0 && (
				<p className="text-sm text-neutral-700">{t(`${key}.empty`)}</p>
			)}
			{items.length > 0 && (
				<ul className="-mr-2 flex max-h-120 flex-col gap-4 overflow-y-auto pr-2">
					{items.map((note) => (
						<li key={note.noteId}>
							<NoteItem
								actions={actions}
								note={note}
								onDelete={
									access.delete
										? (): void => {
												setOpen({ kind: "delete", note });
											}
										: undefined
								}
								onEdit={
									access.update
										? (): void => {
												setOpen({ kind: "edit", note });
											}
										: undefined
								}
							/>
						</li>
					))}
				</ul>
			)}
			{notes.hasNextPage && (
				<Button
					className="self-start"
					disabled={notes.isFetchingNextPage}
					variant="textlink"
					onClick={() => {
						void notes.fetchNextPage();
					}}
				>
					{t(
						notes.isFetchingNextPage ? `${key}.loadingMore` : `${key}.showMore`
					)}
				</Button>
			)}
			{(open?.kind === "add" || open?.kind === "edit") && (
				<NoteDialog
					companyId={companyId}
					editing={open.kind === "edit" ? open.note : undefined}
					membershipId={profile.membershipId}
					name={profile.displayName}
					onClose={close}
				/>
			)}
			{open?.kind === "delete" && (
				<DeleteNote
					companyId={companyId}
					note={open.note}
					profile={profile}
					onClose={close}
				/>
			)}
		</Card>
	);
};
