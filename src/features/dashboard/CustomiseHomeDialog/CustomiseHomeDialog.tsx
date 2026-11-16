import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Dialog } from "@/components/ui/Dialog";
import { failedLineClasses } from "@/features/dashboard/cardStyles";
import { isShown, type HomeSection } from "@/features/dashboard/homeSections";

const key = "dashboard.customise";

export type CustomiseHomeDialogProps = {
	open: boolean;
	/** The sections the person's grants reach, in Home's order. */
	sections: ReadonlyArray<HomeSection>;
	/** The keys the person hides. */
	hiddenSections: ReadonlyArray<string>;
	/** Whether the last save was refused, so the choice went back. */
	saveFailed: boolean;
	onToggle: (section: HomeSection, shown: boolean) => void;
	onReset: () => void;
	onClose: () => void;
};

/**
 * Which of Home's sections the person sees: one box per section, ticked
 * when shown, saved as each is changed, and a reset to show them all.
 */
export const CustomiseHomeDialog = ({
	open,
	sections,
	hiddenSections,
	saveFailed,
	onToggle,
	onReset,
	onClose,
}: CustomiseHomeDialogProps): FunctionComponent => {
	const { t } = useTranslation();
	return (
		<Dialog
			description={t(`${key}.intro`)}
			open={open}
			title={t(`${key}.title`)}
			footer={
				<div className="grid gap-6 sm:grid-cols-2">
					<Button
						disabled={hiddenSections.length === 0}
						variant="secondary"
						onClick={onReset}
					>
						{t(`${key}.reset`)}
					</Button>
					<Button onClick={onClose}>{t(`${key}.done`)}</Button>
				</div>
			}
			onClose={onClose}
		>
			<div className="flex flex-col gap-4">
				{saveFailed && (
					<p className={failedLineClasses} role="alert">
						{t(`${key}.failed`)}
					</p>
				)}
				{sections.map((section) => (
					<Checkbox
						key={section}
						checked={isShown(section, hiddenSections)}
						label={t(`${key}.sections.${section}`)}
						onChange={(event) => {
							onToggle(section, event.target.checked);
						}}
					/>
				))}
			</div>
		</Dialog>
	);
};
