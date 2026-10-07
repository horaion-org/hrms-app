import { useTranslation } from "react-i18next";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { DeleteIcon, EditIcon } from "@/components/ui/Icon";
import { OverflowMenu, OverflowMenuItem } from "@/components/ui/OverflowMenu";
import type { MemberNote } from "@/features/people/api";
import { noteWhen } from "@/features/people/notes";

export type NoteItemProps = {
	note: MemberNote;
	/** Read mode keeps the actions in a menu; edit mode shows them as buttons. */
	actions: "menu" | "buttons";
	/** Left out when the person may not edit notes. */
	onEdit?: () => void;
	/** Left out when the person may not delete notes. */
	onDelete?: () => void;
	className?: string;
};

/**
 * One note: its text as written, line breaks kept, who added it and when,
 * and whether it was edited. With neither action allowed there is no menu.
 */
export const NoteItem = ({
	note,
	actions,
	onEdit,
	onDelete,
	className,
}: NoteItemProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const key = "people.notes";
	const when = noteWhen(
		note.createdAt,
		i18n.resolvedLanguage ?? i18n.language ?? "en",
		t
	);
	const author = note.author.displayName;
	return (
		<div
			className={joinClassNames(
				"flex items-center gap-4 rounded-lg border border-neutral-400 bg-neutral-50 px-4 py-3",
				className
			)}
		>
			<div className="min-w-0 flex-1">
				<p className="text-sm break-words whitespace-pre-wrap text-neutral-900">
					{note.body}
				</p>
				<p className="mt-2 flex flex-wrap items-center gap-x-2 text-xs text-neutral-600">
					<span>
						{author
							? t(`${key}.addedBy`, { name: author })
							: t(`${key}.addedByUnknown`)}
					</span>
					<span aria-hidden="true">•</span>
					<time dateTime={note.createdAt}>{when}</time>
					{note.edited && (
						<>
							<span aria-hidden="true">•</span>
							<span>{t(`${key}.edited`)}</span>
						</>
					)}
				</p>
			</div>
			{actions === "menu" && (onEdit || onDelete) && (
				<OverflowMenu label={t(`${key}.moreActions`, { when })} variant="icon">
					{onEdit && (
						<OverflowMenuItem onClick={onEdit}>
							{t(`${key}.editItem`)}
						</OverflowMenuItem>
					)}
					{onDelete && (
						<OverflowMenuItem onClick={onDelete}>
							{t(`${key}.deleteItem`)}
						</OverflowMenuItem>
					)}
				</OverflowMenu>
			)}
			{actions === "buttons" && (onEdit || onDelete) && (
				<div className="flex shrink-0 items-center">
					{onEdit && (
						<Button
							aria-label={t(`${key}.editNote`, { when })}
							variant="icon"
							onClick={onEdit}
						>
							<EditIcon />
						</Button>
					)}
					{onDelete && (
						<Button
							aria-label={t(`${key}.deleteNote`, { when })}
							variant="icon"
							onClick={onDelete}
						>
							<DeleteIcon className="text-error-600" />
						</Button>
					)}
				</div>
			)}
		</div>
	);
};
