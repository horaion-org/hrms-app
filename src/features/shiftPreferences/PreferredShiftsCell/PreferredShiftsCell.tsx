import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Chip } from "@/components/ui/Chip";
import { MinusIcon } from "@/components/ui/Icon";
import type { PreferredShift } from "@/features/shiftPreferences/api";

export type PreferredShiftsCellProps = {
	/** The day's preferred shifts, in the day's order; two may share a name. */
	shifts: ReadonlyArray<PreferredShift>;
	/** Opens the day's editor; the cell is then one button. Read-only without. */
	onEdit?: () => void;
	/** The button's accessible name, e.g. "Choose shifts for Mon 24 Nov". */
	editLabel?: string;
};

/** One day of a week grid: a chip per preferred shift, or a minus icon read as "No preference". */
export const PreferredShiftsCell = ({
	shifts,
	onEdit,
	editLabel,
}: PreferredShiftsCellProps): FunctionComponent => {
	const { t } = useTranslation();
	const content =
		shifts.length === 0 ? (
			<span className="flex justify-center text-neutral-600">
				<MinusIcon className="size-4" />
				<span className="sr-only">{t("shiftPreferences.none")}</span>
			</span>
		) : (
			<ul className="flex flex-col gap-1">
				{shifts.map((shift) => (
					<li key={shift.shiftId}>
						<Chip label={shift.name} />
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
