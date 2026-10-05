import {
	Listbox,
	ListboxButton,
	ListboxOption,
	ListboxOptions,
} from "@headlessui/react";
import { Fragment, type AriaAttributes, type Ref } from "react";
import { useTranslation } from "react-i18next";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import type { InputStatus } from "@/components/forms/Input";
import type { SelectOption } from "@/components/forms/Select";
import {
	CheckboxFilledIcon,
	CheckboxIcon,
	ChevronDownIcon,
	ChevronUpIcon,
	TickIcon,
} from "@/components/ui/Icon";

type SharedProps = {
	options: Array<SelectOption>;
	placeholder?: string;
	emptyText?: string;
	status?: InputStatus;
	disabled?: boolean;
	name?: string;
	formatSummary?: (selected: Array<SelectOption>) => string;
	className?: string;
	ref?: Ref<HTMLButtonElement>;
	"aria-label"?: string;
	"aria-labelledby"?: string;
	"aria-describedby"?: string;
	"aria-invalid"?: AriaAttributes["aria-invalid"];
};

export type SelectProps = SharedProps &
	(
		| {
				multiple?: false;
				value?: string;
				defaultValue?: string;
				onChange?: (value: string) => void;
		  }
		| {
				multiple: true;
				value?: Array<string>;
				defaultValue?: Array<string>;
				onChange?: (value: Array<string>) => void;
		  }
	);

const statusFocusClasses =
	"focus:outline-2 focus:outline-solid focus:outline-offset-2 focus:outline-ink-blue-500";

const statusClasses: Record<InputStatus, string> = {
	success: `border-success-600 ${statusFocusClasses}`,
	error: `border-error-600 ${statusFocusClasses}`,
};

export const Select = (props: SelectProps): FunctionComponent => {
	const { t } = useTranslation();
	const {
		options,
		placeholder,
		emptyText,
		status,
		disabled,
		className,
		ref,
		value,
		defaultValue,
		"aria-label": ariaLabel,
		"aria-labelledby": ariaLabelledby,
		"aria-describedby": ariaDescribedby,
		"aria-invalid": ariaInvalid,
	} = props;
	return (
		<Listbox
			as="div"
			className="contents"
			defaultValue={defaultValue}
			disabled={disabled}
			multiple={props.multiple}
			name={props.name}
			value={value}
			onChange={(nextValue: string | Array<string>) => {
				if (props.multiple && Array.isArray(nextValue)) {
					props.onChange?.(
						options
							.filter((option) => nextValue.includes(option.value))
							.map((option) => option.value)
					);
				} else if (!props.multiple && typeof nextValue === "string") {
					props.onChange?.(nextValue);
				}
			}}
		>
			{({ value: selectedValue, open }) => {
				const selectedOptions = options.filter((option) =>
					Array.isArray(selectedValue)
						? selectedValue.includes(option.value)
						: option.value === selectedValue
				);
				const summary =
					selectedOptions.length > 1
						? (props.formatSummary?.(selectedOptions) ??
							t("select.selectedCount", { count: selectedOptions.length }))
						: (selectedOptions[0]?.label ?? placeholder);
				return (
					<>
						<ListboxButton as={Fragment}>
							{/* The child preserves caller labelling over ListboxButton's generated label. */}
							{/* eslint-disable-next-line jsx-a11y/role-supports-aria-props -- Select's form-control trigger exposes validation per its public ARIA contract. */}
							<button
								ref={ref}
								aria-describedby={ariaDescribedby}
								aria-label={ariaLabel}
								aria-labelledby={ariaLabelledby}
								type="button"
								aria-invalid={
									ariaInvalid ?? (status === "error" ? true : undefined)
								}
								className={joinClassNames(
									"inline-flex h-11 max-w-full items-center gap-3 rounded-lg border px-4 text-sm outline-hidden",
									disabled
										? "cursor-not-allowed border-neutral-400 bg-neutral-200 text-neutral-500"
										: joinClassNames(
												"bg-white text-ink-blue-900",
												status
													? statusClasses[status]
													: "border-neutral-400 focus:border-ink-blue-900"
											),
									className
								)}
								onKeyDown={(event) => {
									// ListboxButton reserves Enter for form submission; Select opens instead.
									if (event.key === "Enter") {
										event.preventDefault();
										event.currentTarget.click();
									}
								}}
							>
								<span className="min-w-0 flex-1 truncate text-left">
									{summary}
								</span>
								{open ? (
									<ChevronUpIcon className="size-5 shrink-0" />
								) : (
									<ChevronDownIcon className="size-5 shrink-0" />
								)}
							</button>
						</ListboxButton>
						<ListboxOptions
							anchor={{ to: "bottom start", gap: 4 }}
							className="z-50 w-max min-w-(--button-width) overflow-y-auto rounded-lg border border-neutral-400 bg-white py-1 shadow-sm outline-hidden [--anchor-max-height:15.5rem]"
							onKeyDown={(event) => {
								if (event.key !== "Enter" && event.key !== " ") return;
								// Opening can activate a selected disabled option. Block only
								// keyboard activation via public ARIA, so native reset still works.
								const activeId = event.currentTarget.getAttribute(
									"aria-activedescendant"
								);
								const activeOption = activeId
									? event.currentTarget.ownerDocument.getElementById(activeId)
									: null;
								if (activeOption?.getAttribute("aria-disabled") === "true")
									event.preventDefault();
							}}
						>
							{options.length === 0 && (
								<div className="flex h-10 items-center px-4 text-sm text-neutral-500">
									{emptyText ?? t("select.noOptions")}
								</div>
							)}
							{options.map((option) => (
								<ListboxOption
									key={option.value}
									disabled={option.disabled}
									value={option.value}
									className={joinClassNames(
										"flex h-10 items-center justify-between gap-3 px-4 text-sm select-none",
										option.disabled
											? "cursor-not-allowed text-neutral-500"
											: "cursor-pointer text-neutral-800 data-focus:bg-neutral-100"
									)}
								>
									{({ selected }) => (
										<>
											<span className="truncate">{option.label}</span>
											<span className="size-5 shrink-0">
												{props.multiple ? (
													selected ? (
														<CheckboxFilledIcon
															className={joinClassNames(
																"size-5",
																option.disabled
																	? "text-neutral-400"
																	: "text-ink-blue-900"
															)}
														/>
													) : (
														<CheckboxIcon className="size-5 text-neutral-400" />
													)
												) : (
													selected && (
														<TickIcon
															className={joinClassNames(
																"size-5",
																option.disabled
																	? "text-neutral-400"
																	: "text-ink-blue-900"
															)}
														/>
													)
												)}
											</span>
										</>
									)}
								</ListboxOption>
							))}
						</ListboxOptions>
					</>
				);
			}}
		</Listbox>
	);
};
