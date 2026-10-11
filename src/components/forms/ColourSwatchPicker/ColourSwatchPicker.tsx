import { useId } from "react";
import { useTranslation } from "react-i18next";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";

export type ColourSwatchPickerProps = {
	/** CSS colours, one tile each, in display order. */
	colours: ReadonlyArray<string>;
	value: string;
	onChange: (colour: string) => void;
	/** The radios' group name; generated when left out. */
	name?: string;
	/** Names a colour for assistive tech; defaults to "Colour <value>". */
	colourLabel?: (colour: string) => string;
	disabled?: boolean;
	id?: string;
	className?: string;
	"aria-labelledby"?: string;
	"aria-describedby"?: string;
};

/**
 * One colour from a set, drawn as tiles. The tiles are native radios, so the
 * arrow keys move between them; label the group with `aria-labelledby`.
 */
export const ColourSwatchPicker = ({
	colours,
	value,
	onChange,
	name,
	colourLabel,
	disabled = false,
	id,
	className,
	"aria-labelledby": ariaLabelledby,
	"aria-describedby": ariaDescribedby,
}: ColourSwatchPickerProps): FunctionComponent => {
	const { t } = useTranslation();
	const generatedName = useId();
	const groupName = name ?? generatedName;

	return (
		<fieldset
			aria-describedby={ariaDescribedby}
			aria-labelledby={ariaLabelledby}
			disabled={disabled}
			id={id}
			className={joinClassNames(
				"m-0 flex flex-wrap gap-3 border-0 p-0",
				className
			)}
		>
			{colours.map((colour) => (
				<label
					key={colour}
					style={{ backgroundColor: colour }}
					className={joinClassNames(
						"relative size-11 rounded-lg has-checked:ring-2 has-checked:ring-neutral-900 has-checked:ring-inset has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink-blue-500",
						disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
					)}
				>
					<input
						checked={colour === value}
						className="pointer-events-none absolute opacity-0"
						name={groupName}
						type="radio"
						value={colour}
						aria-label={
							colourLabel?.(colour) ??
							t("colourSwatchPicker.colour", { colour })
						}
						onChange={() => {
							onChange(colour);
						}}
					/>
				</label>
			))}
		</fieldset>
	);
};
