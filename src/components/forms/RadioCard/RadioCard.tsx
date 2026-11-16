import { useId, type ReactNode } from "react";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { RadioFilledIcon, RadioIcon } from "@/components/ui/Icon";

export type RadioCardProps = {
	/** Shared by every card in the group, so the arrow keys move between them. */
	name: string;
	value: string;
	checked: boolean;
	onChange: (value: string) => void;
	label: string;
	/** Supporting text under the label; it also describes the radio. */
	description?: ReactNode;
	/** An illustration in the card's top-right tile; decorative. */
	icon?: ReactNode;
	disabled?: boolean;
	/**
	 * Large: a heading row of the icon, the label at 16/24 and the radio, with
	 * the description at full width under it, for a grid of many choices.
	 * Default: the radio, label and description in a row, the icon in a tile.
	 */
	size?: "default" | "large";
	className?: string;
};

const largeCardClasses =
	"relative flex min-w-0 cursor-pointer flex-col gap-2 rounded-lg border border-neutral-400 bg-white p-4 has-checked:border-ink-blue-700 has-checked:bg-ink-blue-50 has-checked:ring-1 has-checked:ring-ink-blue-700 has-checked:ring-inset has-disabled:cursor-not-allowed has-disabled:opacity-50 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink-blue-500";

/**
 * One choice of a single-choice group, drawn as a card. Place the cards inside
 * an element with `role="radiogroup"` and an accessible name.
 */
export const RadioCard = ({
	name,
	value,
	checked,
	onChange,
	label,
	description,
	icon,
	disabled = false,
	size = "default",
	className,
}: RadioCardProps): FunctionComponent => {
	const id = useId();
	const labelId = `${id}-label`;
	const descriptionId = `${id}-description`;
	const input = (
		<input
			aria-describedby={description == null ? undefined : descriptionId}
			// The card wraps the description too; name the radio by its label alone.
			aria-labelledby={labelId}
			checked={checked}
			className="sr-only"
			disabled={disabled}
			id={id}
			name={name}
			type="radio"
			value={value}
			onChange={() => {
				onChange(value);
			}}
		/>
	);

	if (size === "large")
		return (
			<label
				className={joinClassNames(largeCardClasses, className)}
				htmlFor={id}
			>
				{input}
				<span className="flex items-center gap-2">
					{icon != null && (
						<span
							aria-hidden="true"
							className="flex shrink-0 text-ink-blue-900 [&_svg]:size-5"
						>
							{icon}
						</span>
					)}
					<span
						className="min-w-0 flex-1 text-base font-semibold text-neutral-900"
						id={labelId}
					>
						{label}
					</span>
					{checked ? (
						<RadioFilledIcon className="size-5 shrink-0 text-ink-blue-900" />
					) : (
						<RadioIcon className="size-5 shrink-0 text-neutral-500" />
					)}
				</span>
				{description != null && (
					<span className="block text-xs text-neutral-800" id={descriptionId}>
						{description}
					</span>
				)}
			</label>
		);

	return (
		<label
			htmlFor={id}
			className={joinClassNames(
				"relative flex cursor-pointer items-start gap-3 rounded-xl border border-neutral-400 bg-neutral-100 p-6 has-checked:border-2 has-checked:border-ink-blue-900 has-checked:p-[1.4375rem] has-disabled:cursor-not-allowed has-disabled:opacity-50 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink-blue-500",
				className
			)}
		>
			{input}
			{checked ? (
				<RadioFilledIcon className="size-6 shrink-0 text-ink-blue-900" />
			) : (
				<RadioIcon className="size-6 shrink-0 text-neutral-600" />
			)}
			<span className="min-w-0 flex-1 pt-0.5">
				<span
					className="block text-sm font-semibold text-neutral-900"
					id={labelId}
				>
					{label}
				</span>
				{description != null && (
					<span
						className="mt-2 block text-xs font-medium text-neutral-800"
						id={descriptionId}
					>
						{description}
					</span>
				)}
			</span>
			{icon != null && (
				<span
					aria-hidden="true"
					className={joinClassNames(
						"flex size-15.5 shrink-0 items-center justify-center rounded [&_svg]:size-8",
						checked
							? "bg-ink-blue-100 text-ink-blue-900"
							: "bg-neutral-300 text-neutral-700"
					)}
				>
					{icon}
				</span>
			)}
		</label>
	);
};
