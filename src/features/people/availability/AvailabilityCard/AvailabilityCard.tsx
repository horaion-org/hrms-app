import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Card } from "@/components/ui/Card";
import { TimeIcon } from "@/components/ui/Icon";
import {
	byDay,
	formatWindow,
	type WeeklyWindow,
} from "@/features/people/availability/availabilityModel";

export type AvailabilityCardProps = {
	/** The pattern to show; undefined while it loads. */
	windows: ReadonlyArray<WeeklyWindow> | undefined;
	/** Set when it could not be loaded. */
	failed?: boolean;
	/** Usually an "Edit availability" hyperlink, placed at the top right. */
	action?: ReactNode;
	/** Beside the title, such as the week selector. */
	titleAside?: ReactNode;
	/** Shown in place of the week when there are no windows at all; without it, every day reads "—". */
	emptyMessage?: string;
	className?: string;
};

const key = "people.availability";

/**
 * A part-time person's weekly availability as a strip of the seven days,
 * Monday first, each listing its windows one per line, or "—" when it has
 * none. On narrow screens each day takes a row of its own.
 */
export const AvailabilityCard = ({
	windows,
	failed = false,
	action,
	titleAside,
	emptyMessage,
	className,
}: AvailabilityCardProps): FunctionComponent => {
	const { t } = useTranslation();
	const showEmpty = emptyMessage !== undefined && windows?.length === 0;
	return (
		<Card
			action={action}
			className={className}
			icon={TimeIcon}
			title={t(`${key}.title`)}
			titleAside={titleAside}
		>
			{failed ? (
				<p className="text-sm text-error-700" role="alert">
					{t(`${key}.failed`)}
				</p>
			) : !windows ? (
				<p className="text-sm text-neutral-700">{t(`${key}.loading`)}</p>
			) : showEmpty ? (
				<p className="text-sm text-neutral-700">{emptyMessage}</p>
			) : (
				<dl className="grid gap-3 lg:grid-cols-7 lg:gap-4">
					{byDay(windows).map(({ day, windows: dayWindows }) => (
						<div key={day} className="flex gap-4 lg:flex-col lg:gap-2">
							<dt className="w-28 shrink-0 text-sm font-semibold text-neutral-900 lg:w-auto">
								{t(`weekdays.${day}`)}
							</dt>
							<dd className="text-sm text-neutral-900">
								{dayWindows.length === 0 ? (
									<>
										<span aria-hidden="true" className="text-neutral-600">
											—
										</span>
										<span className="sr-only">{t(`${key}.none`)}</span>
									</>
								) : (
									dayWindows.map((window) => (
										<span key={window.startTime} className="block">
											{formatWindow(window)}
										</span>
									))
								)}
							</dd>
						</div>
					))}
				</dl>
			)}
		</Card>
	);
};
