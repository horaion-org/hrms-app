import { useEffect, useId, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { RadioCard } from "@/components/forms/RadioCard";
import type {
	ConstraintCategory,
	ConstraintType,
} from "@/features/scheduling/constraints/api";
import {
	categoryIconOf,
	constraintTypeLookOf,
} from "@/features/scheduling/constraints/constraintTypeLooks";
import type { ConstraintTypeGroup } from "@/features/scheduling/constraints/ConstraintDialog/typeGroups";

export type ConstraintTypeChooserProps = {
	/** The kinds to offer, grouped by category, in the order the API lists them. */
	groups: ReadonlyArray<ConstraintTypeGroup>;
	/** The kind chosen; empty for none yet. */
	value: string;
	onChange: (type: ConstraintType) => void;
	/** The category to bring into view first, as when Add is pressed on that section. */
	startAt?: ConstraintCategory;
	disabled?: boolean;
};

/**
 * Step 1 of adding a constraint: every kind the API offers as a card with its
 * icon, what it does and an example, under its category's heading. One kind
 * is chosen at a time.
 */
export const ConstraintTypeChooser = ({
	groups,
	value,
	onChange,
	startAt,
	disabled = false,
}: ConstraintTypeChooserProps): FunctionComponent => {
	const { t } = useTranslation();
	const id = useId();
	const startRef = useRef<HTMLElement>(null);
	useEffect(() => {
		startRef.current?.scrollIntoView?.({ block: "start" });
	}, []);
	return (
		<div className="flex flex-col gap-8">
			{groups.map(({ category, types }) => {
				const headingId = `${id}-${category}`;
				const CategoryIcon = categoryIconOf(category);
				return (
					<section
						key={category}
						ref={category === startAt ? startRef : undefined}
						aria-labelledby={headingId}
						className="flex flex-col gap-4"
					>
						<div className="flex items-center gap-3">
							<span
								aria-hidden="true"
								className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-ink-blue-50 text-ink-blue-900 [&_svg]:size-6"
							>
								<CategoryIcon />
							</span>
							<div className="min-w-0">
								<h3
									className="text-base font-bold text-neutral-900"
									id={headingId}
								>
									{t(`scheduling.constraints.categories.${category}`)}
								</h3>
								<p className="text-xs text-neutral-700">
									{t(`scheduling.constraints.categoryDescriptions.${category}`)}
								</p>
							</div>
						</div>
						<div
							aria-labelledby={headingId}
							className="grid grid-cols-[repeat(auto-fit,minmax(15rem,1fr))] gap-3"
							role="radiogroup"
						>
							{types.map((option) => {
								const look = constraintTypeLookOf(option.type, t);
								return (
									<RadioCard
										key={option.type}
										size="large"
										checked={value === option.type}
										disabled={disabled}
										icon={<look.Icon />}
										label={look.label}
										name={`${id}-type`}
										value={option.type}
										description={
											look.description && (
												<>
													{look.description}
													<span className="mt-2 block rounded-sm bg-neutral-100 px-3 py-2 text-neutral-900">
														{look.example}
													</span>
												</>
											)
										}
										onChange={() => {
											onChange(option.type);
										}}
									/>
								);
							})}
						</div>
					</section>
				);
			})}
		</div>
	);
};
