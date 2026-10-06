import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import dayjs from "dayjs";
import "dayjs/locale/es";
import {
	useId,
	useRef,
	useState,
	type AriaAttributes,
	type FocusEventHandler,
	type Ref,
} from "react";
import { useTranslation } from "react-i18next";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import {
	Calendar,
	type CalendarProps,
	type DateRange,
	type IsoDate,
	todayDate,
} from "@/components/forms/Calendar";
import type { InputStatus } from "@/components/forms/Input";
import {
	ChevronDownIcon,
	CloseIcon,
	SchedulingIcon,
} from "@/components/ui/Icon";

type SharedProps = {
	label: string;
};

export type DatePickerProps = SharedProps &
	(
		| {
				mode?: "range";
				value: DateRange;
				onChange: (range: DateRange) => void;
		  }
		| (Pick<
				CalendarProps,
				"minDate" | "maxDate" | "isDateDisabled" | "defaultMonth"
		  > & {
				mode: "single";
				/** An empty string (or undefined) means no date is chosen. */
				value?: IsoDate;
				onChange: (value: IsoDate) => void;
				placeholder?: string;
				/** Shows a clear action while a date is chosen; clearing reports "". */
				clearable?: boolean;
				status?: InputStatus;
				disabled?: boolean;
				name?: string;
				id?: string;
				className?: string;
				ref?: Ref<HTMLButtonElement>;
				onBlur?: FocusEventHandler<HTMLButtonElement>;
				"aria-labelledby"?: string;
				"aria-describedby"?: string;
				"aria-invalid"?: AriaAttributes["aria-invalid"];
		  })
	);

/* Matches Select's trigger: a status keeps its border, so focus shows a ring. */
const statusFocusClasses =
	"focus:outline-2 focus:outline-solid focus:outline-offset-2 focus:outline-ink-blue-500";

const statusClasses: Record<InputStatus, string> = {
	success: `border-success-600 ${statusFocusClasses}`,
	error: `border-error-600 ${statusFocusClasses}`,
};

/* Same locale choice as Calendar's labels, so the field and grid agree. */
const localeFor = (language: string): string =>
	language.split("-")[0] === "es" ? "es" : "en";

/** Day first in every language, e.g. "22 Mar 1987"; month names are localised. */
const formatDate = (date: IsoDate, language: string): string =>
	dayjs(date).locale(localeFor(language)).format("D MMM YYYY");

export const DatePicker = (props: DatePickerProps): FunctionComponent => {
	const { label } = props;
	const { i18n, t } = useTranslation();
	const trigger = useRef<HTMLButtonElement>(null);
	const textId = useId();
	const [today] = useState(() => todayDate(Date.now()));
	const language = i18n.resolvedLanguage ?? i18n.language ?? "en";
	if (props.mode !== "single") {
		const { value, onChange } = props;
		const text = `${formatDate(value.start, language)} – ${formatDate(value.end, language)}`;
		return (
			<Popover className="relative min-w-0">
				<PopoverButton
					ref={trigger}
					aria-label={`${label}: ${text}`}
					className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border border-neutral-400 bg-white px-4 text-sm font-semibold text-neutral-900 focus-visible:outline-2 focus-visible:outline-ink-blue-500"
				>
					<SchedulingIcon className="size-5 shrink-0" />
					<span>{text}</span>
					<ChevronDownIcon className="size-4 shrink-0" />
				</PopoverButton>
				<PopoverPanel
					focus
					anchor="bottom start"
					className="z-60 max-w-[calc(100vw-2rem)] rounded-lg border border-neutral-400 bg-white p-2 shadow-lg [--anchor-gap:8px]"
				>
					{({ close }) => (
						<Calendar
							aria-label={label}
							mode="range"
							value={value}
							onChange={(range) => {
								onChange(range);
								close(trigger);
							}}
						/>
					)}
				</PopoverPanel>
			</Popover>
		);
	}
	const {
		value,
		onChange,
		minDate,
		maxDate,
		status,
		disabled,
		"aria-labelledby": ariaLabelledby,
		"aria-invalid": ariaInvalid,
	} = props;
	const text = value ? formatDate(value, language) : props.placeholder;
	// With nothing chosen, open on today or the nearest month the limits allow.
	const nearestMonth =
		minDate && today < minDate
			? minDate
			: maxDate && today > maxDate
				? maxDate
				: today;
	// A caller's label element replaces `label`; the shown text then adds the value.
	const accessibleName = text ? `${label}: ${text}` : label;
	const cleared = Boolean(props.clearable && value && !disabled);
	return (
		<Popover className={joinClassNames("relative min-w-0", props.className)}>
			{props.name !== undefined && (
				<input
					disabled={disabled}
					name={props.name}
					type="hidden"
					value={value ?? ""}
				/>
			)}
			<PopoverButton
				ref={(element: HTMLButtonElement | null) => {
					trigger.current = element;
					if (typeof props.ref === "function") return props.ref(element);
					if (props.ref) props.ref.current = element;
				}}
				aria-describedby={props["aria-describedby"]}
				aria-invalid={ariaInvalid ?? (status === "error" ? true : undefined)}
				aria-label={ariaLabelledby ? undefined : accessibleName}
				aria-labelledby={ariaLabelledby && `${ariaLabelledby} ${textId}`}
				disabled={disabled}
				id={props.id}
				className={joinClassNames(
					"flex h-11 w-full items-center gap-3 rounded-lg border px-4 text-sm outline-hidden",
					cleared && "pr-20",
					disabled
						? "cursor-not-allowed border-neutral-400 bg-neutral-200 text-neutral-500"
						: joinClassNames(
								"bg-white text-ink-blue-900",
								status
									? statusClasses[status]
									: "border-neutral-400 focus:border-ink-blue-900"
							)
				)}
				onBlur={props.onBlur}
			>
				<span
					id={textId}
					className={joinClassNames(
						"min-w-0 flex-1 truncate text-left",
						!value && !disabled && "text-neutral-500"
					)}
				>
					{text}
				</span>
				<SchedulingIcon className="size-5 shrink-0" />
			</PopoverButton>
			{cleared && (
				<button
					aria-label={t("datePicker.clear")}
					className="absolute top-1/2 right-12 -translate-y-1/2 rounded p-0.5 outline-offset-2 focus-visible:outline-2 focus-visible:outline-ink-blue-500"
					type="button"
					onClick={() => {
						onChange("");
						trigger.current?.focus();
					}}
				>
					<CloseIcon className="size-4" />
				</button>
			)}
			<PopoverPanel
				focus
				anchor="bottom start"
				className="z-60 max-w-[calc(100vw-2rem)] rounded-lg border border-neutral-400 bg-white p-2 shadow-lg [--anchor-gap:8px]"
			>
				{({ close }) => (
					<Calendar
						aria-label={label}
						defaultMonth={props.defaultMonth ?? nearestMonth}
						isDateDisabled={props.isDateDisabled}
						maxDate={maxDate}
						minDate={minDate}
						value={value || null}
						onChange={(date) => {
							onChange(date);
							close(trigger);
						}}
					/>
				)}
			</PopoverPanel>
		</Popover>
	);
};
