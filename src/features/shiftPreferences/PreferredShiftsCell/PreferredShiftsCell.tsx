import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Chip } from "@/components/ui/Chip";

export type PreferredShiftsCellProps = {
	/** The day's preferred shift names, in the day's order. */
	names: ReadonlyArray<string>;
	/** Opens the day's editor; the cell is then one button. Read-only without. */
	onEdit?: () => void;
	/** The button's accessible name, e.g. "Choose shifts for Mon 24 Nov". */
	editLabel?: string;
};

/** One day of a week grid: a chip per preferred shift, or a dash read as "No preference". */
export const PreferredShiftsCell = ({
	names,
	onEdit,
	editLabel,
}: PreferredShiftsCellProps): FunctionComponent => {
	const { t } = useTranslation();
	const content =
		names.length === 0 ? (
			<span className="block text-center text-sm text-neutral-600">
				<span aria-hidden="true">—</span>
				<span className="sr-only">{t("shiftPreferences.none")}</span>
			</span>
		) : (
			<ul className="flex flex-col gap-1">
				{names.map((name) => (
					<li key={name}>
						<Chip label={name} />
					</li>
				))}
			</ul>
		);
	if (!onEdit) return content;
	return (
		<button
			aria-label={editLabel}
			className="block min-h-11 w-full cursor-pointer rounded-sm p-1 text-left hover:bg-ink-blue-50 focus-visible:outline-2 focus-visible:outline-ink-blue-500"
			type="button"
			onClick={onEdit}
		>
			{content}
		</button>
	);
};
