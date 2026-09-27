import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/Icon";

export type CalendarHeaderProps = {
	title: string;
	previousLabel: string;
	nextLabel: string;
	previousDisabled?: boolean;
	nextDisabled?: boolean;
	titleLabel?: string;
	onTitleClick?: () => void;
	onPrevious: () => void;
	onNext: () => void;
};

export const CalendarHeader = ({
	title,
	previousLabel,
	nextLabel,
	previousDisabled = false,
	nextDisabled = false,
	titleLabel,
	onTitleClick,
	onPrevious,
	onNext,
}: CalendarHeaderProps): FunctionComponent => (
	<div className="mb-2 flex h-9 items-center justify-between text-sm font-medium text-neutral-900">
		<Button
			aria-label={previousLabel}
			className="focus-visible:outline-solid"
			disabled={previousDisabled}
			variant="icon"
			onClick={onPrevious}
		>
			<ChevronLeftIcon />
		</Button>
		<Button
			aria-label={titleLabel}
			className="h-9 text-neutral-900 focus-visible:outline-solid disabled:text-neutral-900"
			disabled={!onTitleClick}
			variant="textlink"
			onClick={onTitleClick}
		>
			<span aria-atomic="true" aria-live="polite">
				{title}
			</span>
		</Button>
		<Button
			aria-label={nextLabel}
			className="focus-visible:outline-solid"
			disabled={nextDisabled}
			variant="icon"
			onClick={onNext}
		>
			<ChevronRightIcon />
		</Button>
	</div>
);
