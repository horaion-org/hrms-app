import {
	Combobox as HeadlessCombobox,
	ComboboxButton,
	ComboboxInput,
	ComboboxOption,
	ComboboxOptions,
} from "@headlessui/react";
import {
	Fragment,
	useCallback,
	useId,
	useRef,
	type AriaAttributes,
	type ReactNode,
	type Ref,
	type RefObject,
} from "react";
import { useTranslation } from "react-i18next";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import type { InputStatus } from "@/components/forms/Input";
import { ComboboxTrigger } from "@/components/forms/Combobox/ComboboxTrigger";
import { ComboboxPanel } from "@/components/forms/Combobox/ComboboxPanel";
import { ComboboxSearch } from "@/components/forms/Combobox/ComboboxSearch";
import { Token } from "@/components/forms/Combobox/Token";
import {
	CheckboxFilledIcon,
	CheckboxIcon,
	ChevronDownIcon,
	PlusIcon,
} from "@/components/ui/Icon";

/** The create row's value; never reported as a choice. */
const CREATE = Symbol("create");

type ComboboxSelectionProps<T> =
	| {
			multiple?: true;
			value: Array<T>;
			onChange: (value: Array<T>) => void;
			maxSelected?: number;
	  }
	| {
			multiple: false;
			value: T | null;
			onChange: (value: T | null) => void;
			maxSelected?: never;
			/**
			 * Offers a "Create" row for a query that matches no option's label,
			 * ignoring case, in place of the empty text; chosen, it receives
			 * the trimmed query.
			 */
			onCreate?: (query: string) => void;
	  };

export type ComboboxProps<T> = ComboboxSelectionProps<T> & {
	options: Array<T>;
	getKey: (option: T) => string;
	getLabel: (option: T) => string;
	/** Single choice: the trigger's text for the chosen option; defaults to `getLabel`. */
	formatValue?: (option: T) => string;
	renderOption?: (option: T) => ReactNode;
	query: string;
	onQueryChange: (query: string) => void;
	loading?: boolean;
	loadingText?: string;
	emptyText?: string;
	footer?: ReactNode;
	/** Places the list under this element, e.g. a wider field the trigger sits in, instead of the trigger. */
	panelAnchor?: RefObject<HTMLElement | null>;
	placeholder: string;
	searchPlaceholder: string;
	status?: InputStatus;
	disabled?: boolean;
	id?: string;
	className?: string;
	ref?: Ref<HTMLButtonElement>;
	"aria-label"?: string;
	"aria-labelledby"?: string;
	"aria-describedby"?: string;
	"aria-invalid"?: AriaAttributes["aria-invalid"];
	"aria-required"?: AriaAttributes["aria-required"];
};

export const Combobox = <T,>(props: ComboboxProps<T>): FunctionComponent => {
	const { t } = useTranslation();
	const trigger = useRef<HTMLButtonElement>(null);
	const listId = useId();
	const tabbing = useRef(false);
	const focusSearch = useCallback((element: HTMLInputElement | null): void => {
		element?.focus();
	}, []);
	const { options, getKey, getLabel, query, onQueryChange, disabled } = props;
	const values = props.multiple === false ? [] : props.value;
	const onCreate = props.multiple === false ? props.onCreate : undefined;
	const creatable = query.trim();
	const createRow =
		onCreate !== undefined &&
		creatable !== "" &&
		!options.some(
			(option) => getLabel(option).toLowerCase() === creatable.toLowerCase()
		);
	const rootProps = {
		as: "div" as const,
		by: (a: T | null, b: T | null): boolean =>
			a === null || b === null || a === CREATE || b === CREATE
				? a === b
				: getKey(a) === getKey(b),
		disabled,
		onClose: (): void => {
			if (!tabbing.current)
				requestAnimationFrame(() => {
					trigger.current?.focus();
				});
			tabbing.current = false;
		},
	};
	const validation = {
		"aria-invalid":
			props["aria-invalid"] ?? (props.status === "error" ? true : undefined),
	};
	const statusClasses: Record<InputStatus, string> = {
		error: "border-error-600",
		success: "border-success-600",
	};
	const renderControl = ({
		open,
	}: {
		open: boolean;
	}): NonNullable<FunctionComponent> => (
		<>
			<div
				className={joinClassNames(
					"relative min-h-11 rounded-lg border px-4 py-2 text-sm focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ink-blue-500",
					disabled
						? "cursor-not-allowed border-neutral-400 bg-neutral-200 text-neutral-500"
						: joinClassNames(
								"bg-white text-ink-blue-900",
								props.status
									? statusClasses[props.status]
									: "border-neutral-400 focus-within:border-ink-blue-900"
							),
					props.className
				)}
			>
				<ComboboxButton
					ref={(element) => {
						trigger.current = element;
						if (typeof props.ref === "function") return props.ref(element);
						if (props.ref) props.ref.current = element;
					}}
					aria-required={props["aria-required"]}
					as={ComboboxTrigger}
					labelledBy={props["aria-labelledby"]}
					listId={listId}
					{...validation}
					aria-controls={open ? listId : undefined}
					aria-describedby={props["aria-describedby"]}
					aria-label={props["aria-label"]}
					aria-labelledby={props["aria-labelledby"]}
					className="absolute inset-0 flex w-full items-center justify-between gap-3 px-4 text-left"
					id={props.id}
					type="button"
					onKeyDown={(event) => {
						if (
							props.multiple === false &&
							props.value !== null &&
							!disabled &&
							event.key === "Backspace" &&
							!event.nativeEvent.isComposing
						) {
							event.preventDefault();
							props.onChange(null);
						}
					}}
				>
					<span>
						{props.multiple === false
							? props.value === null
								? props.placeholder
								: (props.formatValue ?? getLabel)(props.value)
							: values.length === 0
								? props.placeholder
								: null}
					</span>
					<ChevronDownIcon className="size-5 shrink-0" />
				</ComboboxButton>
				{props.multiple !== false && values.length > 0 && (
					<div className="pointer-events-none relative flex flex-wrap gap-1.5 pr-6 [&_button]:pointer-events-auto">
						{values.map((option) => (
							<Token
								key={getKey(option)}
								disabled={disabled}
								label={getLabel(option)}
								onRemove={() => {
									props.onChange(
										values.filter((chosen) => getKey(chosen) !== getKey(option))
									);
									trigger.current?.focus();
								}}
							/>
						))}
					</div>
				)}
			</div>
			<ComboboxOptions
				portal
				as={ComboboxPanel}
				className="flex flex-col overflow-hidden rounded-lg border border-neutral-400 bg-white shadow-sm"
				modal={false}
				trigger={props.panelAnchor ?? trigger}
			>
				<ComboboxInput as={Fragment}>
					<ComboboxSearch
						ref={focusSearch}
						aria-controls={listId}
						aria-label={props.searchPlaceholder}
						className="h-11 w-full shrink-0 border-b border-neutral-300 px-4 outline-hidden"
						listId={listId}
						placeholder={props.searchPlaceholder}
						value={query}
						onChange={(event) => {
							onQueryChange(event.target.value);
						}}
						onKeyDown={(event) => {
							if (event.key === "Tab") {
								tabbing.current = true;
								trigger.current?.focus();
							}
							if (
								event.key === " " &&
								query === "" &&
								!event.nativeEvent.isComposing
							) {
								const activeId = event.currentTarget.getAttribute(
									"aria-activedescendant"
								);
								const active = activeId
									? event.currentTarget.ownerDocument.getElementById(activeId)
									: null;
								if (active && active.getAttribute("aria-disabled") !== "true") {
									event.preventDefault();
									event.currentTarget.dispatchEvent(
										new KeyboardEvent("keydown", {
											key: "Enter",
											bubbles: true,
											cancelable: true,
										})
									);
								}
							}
							if (
								event.key === "Backspace" &&
								query === "" &&
								props.multiple !== false &&
								values.length > 0 &&
								!event.nativeEvent.isComposing
							) {
								event.preventDefault();
								props.onChange(values.slice(0, -1));
							}
						}}
					/>
				</ComboboxInput>
				<div
					aria-label={props["aria-label"]}
					aria-labelledby={props["aria-labelledby"]}
					aria-multiselectable={props.multiple === false ? undefined : true}
					className="min-h-0 max-h-60 overflow-y-auto py-1"
					id={listId}
					role="listbox"
				>
					{options.map((option) => (
						<ComboboxOption
							key={getKey(option)}
							aria-label={getLabel(option)}
							className="flex min-h-12 cursor-pointer items-center gap-3 px-4 text-sm data-focus:bg-neutral-100 data-disabled:cursor-not-allowed data-disabled:text-neutral-500"
							value={option}
							disabled={
								props.maxSelected !== undefined &&
								values.length >= props.maxSelected &&
								!values.some((chosen) => getKey(chosen) === getKey(option))
							}
						>
							{({ selected }) => (
								<>
									<span className="min-w-0 flex-1">
										{props.renderOption?.(option) ?? getLabel(option)}
									</span>
									{selected ? (
										<CheckboxFilledIcon className="size-5" />
									) : (
										<CheckboxIcon className="size-5" />
									)}
								</>
							)}
						</ComboboxOption>
					))}
					{createRow && (
						<ComboboxOption
							aria-label={t("combobox.create", { query: creatable })}
							className="flex min-h-12 cursor-pointer items-center gap-3 px-4 text-sm font-medium text-ink-blue-700 data-focus:bg-neutral-100"
							value={CREATE as unknown as T}
						>
							<PlusIcon className="size-5 shrink-0" />
							<span className="min-w-0 flex-1 truncate">
								{t("combobox.create", { query: creatable })}
							</span>
						</ComboboxOption>
					)}
				</div>
				{(props.loading || (options.length === 0 && !createRow)) && (
					<div className="px-4 py-3 text-sm text-neutral-500" role="status">
						{props.loading
							? (props.loadingText ?? t("combobox.loading"))
							: (props.emptyText ?? t("combobox.noResults"))}
					</div>
				)}
				{props.footer && (
					<div className="border-t border-neutral-300 px-4 py-3 text-xs text-neutral-500">
						{props.footer}
					</div>
				)}
			</ComboboxOptions>
		</>
	);
	return props.multiple === false ? (
		<HeadlessCombobox<T | null, false, "div">
			{...rootProps}
			value={props.value}
			onChange={(next) => {
				if ((next as unknown) === CREATE) onCreate?.(creatable);
				else props.onChange(next);
			}}
		>
			{renderControl}
		</HeadlessCombobox>
	) : (
		<HeadlessCombobox<Array<T>, true, "div">
			{...rootProps}
			multiple
			value={props.value}
			onChange={(next) => {
				if (
					disabled ||
					(props.maxSelected !== undefined &&
						next.length > props.maxSelected &&
						next.length > props.value.length)
				)
					return;
				props.onChange(next);
			}}
		>
			{renderControl}
		</HeadlessCombobox>
	);
};
