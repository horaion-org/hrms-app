import { useId, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { ArrowLeftIcon, SaveIcon } from "@/components/ui/Icon";

export type StepActionsProps = {
	/** Shows Back, returning to the previous step. */
	onBack?: () => void;
	/** Shows Save Draft, which waits for the scheduling API and stays disabled. */
	saveDraft?: boolean;
	nextLabel: string;
	nextIcon: ReactNode;
	onNext?: () => void;
	/** Submits this form instead of calling `onNext`. */
	form?: string;
	/** For an action the API can't take yet; the note says so. */
	nextDisabled?: boolean;
	/** Explains the disabled actions; shown whenever one is. */
	unavailableNote: string;
	className?: string;
};

/** Back, Save Draft and the forward action at the foot of a Create Schedule step. */
export const StepActions = ({
	onBack,
	saveDraft = false,
	nextLabel,
	nextIcon,
	onNext,
	form,
	nextDisabled = false,
	unavailableNote,
	className,
}: StepActionsProps): FunctionComponent => {
	const { t } = useTranslation();
	const noteId = useId();
	const noted = saveDraft || nextDisabled;

	return (
		<div className={joinClassNames("flex flex-col gap-3", className)}>
			<div className="flex flex-wrap items-center justify-between gap-4">
				{onBack && (
					<Button
						className="min-w-30"
						leadingIcon={<ArrowLeftIcon />}
						variant="secondary"
						onClick={onBack}
					>
						{t("scheduling.actions.back")}
					</Button>
				)}
				<div className="ml-auto flex flex-wrap gap-4">
					{saveDraft && (
						<Button
							disabled
							aria-describedby={noteId}
							leadingIcon={<SaveIcon />}
							variant="secondary"
						>
							{t("scheduling.actions.saveDraft")}
						</Button>
					)}
					<Button
						aria-describedby={nextDisabled ? noteId : undefined}
						className="min-w-30"
						disabled={nextDisabled}
						form={form}
						trailingIcon={nextIcon}
						type={form === undefined ? "button" : "submit"}
						onClick={onNext}
					>
						{nextLabel}
					</Button>
				</div>
			</div>
			{noted && (
				<p className="text-right text-sm text-neutral-700" id={noteId}>
					{unavailableNote}
				</p>
			)}
		</div>
	);
};
