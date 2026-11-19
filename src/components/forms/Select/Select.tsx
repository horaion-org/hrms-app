import {
	Listbox,
	ListboxButton,
	ListboxOption,
	ListboxOptions,
} from "@headlessui/react";
import {
	Fragment,
	useId,
	useState,
	type AriaAttributes,
	type ReactNode,
	type Ref,
} from "react";
import { useTranslation } from "react-i18next";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import type { InputStatus } from "@/components/forms/Input";
import type { SelectOption } from "@/components/forms/Select";
import {
	CheckboxFilledIcon,
	CheckboxHalfIcon,
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
				/**
				 * Offers a row above the options that chooses or clears every
				 * available option at once; disabled options keep their state.
				 */
				selectAllLabel?: string;
				/**
				 * Offers a row of group chips above the options, one per group with
				 * an available option, each choosing or clearing every available
				 * option of its group at once, as the select-all row does for all of
				 * them. The options are then one flat list, each named with its group.
				 */
				wholeGroups?: boolean;
				/** The small muted heading over the group chips, e.g. "Shift groups"; none without it. */
				groupsLabel?: string;
				/** The muted text after a group chip's name, from its option count, e.g. "2 shifts"; shown for a group of several only. */
				groupCountText?: (count: number) => string;
		  }
	);

/** The value of the select-all row; never reported, never submitted. */
const SELECT_ALL = "\u0000select-all";

/** The value of a group chip is this prefix and the group; never reported, never submitted. */
const WHOLE_GROUP = "\u0000group:";

/** How many of some options are chosen: every one, some of them, or none. */
type ChosenState = "all" | "some" | "none";

/** Whether every, some or none of the given options are chosen; none when there are no options. */
const chosenStateOf = (
	members: Array<SelectOption>,
	chosenValues: Array<string>
): ChosenState => {
	const chosenCount = members.filter((option) =>
		chosenValues.includes(option.value)
	).length;
	if (members.length > 0 && chosenCount === members.length) return "all";
	return chosenCount > 0 ? "some" : "none";
};

/** A group chip's chosen state, as its aria-checked value: a chip is an option, which may be half checked. */
const groupChipChecked: Record<ChosenState, "true" | "mixed" | "false"> = {
	all: "true",
	some: "mixed",
	none: "false",
};

/** A group chip's look: filled when its whole group is chosen, outlined in the chosen colour when some is, neutral when none is. */
const groupChipClasses: Record<ChosenState, string> = {
	all: "border-ink-blue-700 bg-ink-blue-700 text-white",
	some: "border-ink-blue-700 bg-white text-ink-blue-900",
	none: "border-neutral-400 bg-white text-neutral-800",
};

/** The groups that have an available option, each once, in the order they first appear. */
const choosableGroupsOf = (options: Array<SelectOption>): Array<string> =>
	[...new Set(options.map((option) => option.group))].filter(
		(group): group is string =>
			group !== undefined &&
			options.some((option) => option.group === group && !option.disabled)
	);

/** A run of consecutive options sharing one heading, or none. */
type OptionRun = { group: string | undefined; options: Array<SelectOption> };

/** Splits the options into runs of the same group, keeping the caller's order. */
const optionRuns = (options: Array<SelectOption>): Array<OptionRun> =>
	options.reduce<Array<OptionRun>>((runs, option) => {
		const last = runs[runs.length - 1];
		if (last && last.group === option.group) last.options.push(option);
		else runs.push({ group: option.group, options: [option] });
		return runs;
	}, []);

/** An option's group, to name after its label in whole-groups mode; none when it only repeats the label. */
const groupNoteOf = (option: SelectOption): string | undefined =>
	option.group !== undefined &&
	option.group.trim().toLowerCase() !== option.label.trim().toLowerCase()
		? option.group
		: undefined;

/**
 * A row's text, then any muted note after it. The note takes only the room
 * left, so it is cut first and the list never scrolls sideways; the space
 * between them keeps the two apart in the row's accessible name.
 */
const RowText = ({
	text,
	note,
	description,
}: {
	text: string;
	note: string | undefined;
	description?: string;
}): FunctionComponent => {
	if (note === undefined && description !== undefined)
		return (
			<span className="flex min-w-0 flex-col">
				<span className="truncate">{text}</span>{" "}
				<span className="truncate text-xs font-normal text-neutral-600">
					{description}
				</span>
			</span>
		);
	return note === undefined ? (
		<span className="truncate">{text}</span>
	) : (
		<span className="flex min-w-0 flex-1 items-baseline gap-2">
			<span className="truncate">{text}</span>{" "}
			<span className="min-w-0 flex-1 truncate font-normal text-neutral-600">
				{note}
			</span>
		</span>
	);
};

const statusFocusClasses =
	"focus:outline-2 focus:outline-solid focus:outline-offset-2 focus:outline-ink-blue-500";

const statusClasses: Record<InputStatus, string> = {
	success: `border-success-600 ${statusFocusClasses}`,
	error: `border-error-600 ${statusFocusClasses}`,
};

export const Select = (props: SelectProps): FunctionComponent => {
	const { t } = useTranslation();
	const groupId = useId();
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
	const selectAllLabel = props.multiple ? props.selectAllLabel : undefined;
	const wholeGroups = props.multiple === true && props.wholeGroups === true;
	const groupsLabel = props.multiple ? props.groupsLabel : undefined;
	const groupCountText = props.multiple ? props.groupCountText : undefined;
	// With a select-all row or group chips the Select keeps its own value, so
	// they can set many options at once even when the caller gave only a default.
	const keepsOwnValue = selectAllLabel !== undefined || wholeGroups;
	const [own, setOwn] = useState<Array<string>>(() =>
		Array.isArray(defaultValue) ? defaultValue : []
	);
	const current = keepsOwnValue ? (value ?? own) : value;
	const chosenValues = Array.isArray(current) ? current : [];
	const available = options.filter((option) => !option.disabled);
	const availableState = chosenStateOf(available, chosenValues);
	const choosableGroups = wholeGroups ? choosableGroupsOf(options) : [];
	const groupsLabelId =
		groupsLabel === undefined ? undefined : `${groupId}-groups`;
	/** Whether every, some or none of a group's available options are chosen. */
	const groupState = (group: string): ChosenState =>
		chosenStateOf(
			available.filter((option) => option.group === group),
			chosenValues
		);
	/** The values after a group chip: its available options all chosen, or all cleared when they already were. */
	const toggledGroup = (group: string): Array<string> => {
		const clearing = groupState(group) === "all";
		return options
			.filter((option) =>
				option.group !== group || option.disabled
					? chosenValues.includes(option.value)
					: !clearing
			)
			.map((option) => option.value);
	};
	const stateIcon = (state: ChosenState): ReactNode =>
		state === "all" ? (
			<CheckboxFilledIcon className="size-5 text-ink-blue-900" />
		) : state === "some" ? (
			<CheckboxHalfIcon className="size-5 text-ink-blue-900" />
		) : (
			<CheckboxIcon className="size-5 text-neutral-400" />
		);
	/**
	 * A group's chip: a pill option that chooses or clears the group's available
	 * options, with its count for a group of several and a tick when all are chosen.
	 */
	const renderGroupChip = (group: string): ReactNode => {
		const memberCount = options.filter(
			(option) => option.group === group
		).length;
		const countText =
			memberCount > 1 ? groupCountText?.(memberCount) : undefined;
		const state = groupState(group);
		return (
			<ListboxOption
				key={group}
				aria-checked={groupChipChecked[state]}
				aria-label={t("select.wholeGroup", { group })}
				value={`${WHOLE_GROUP}${group}`}
				className={joinClassNames(
					"inline-flex min-h-8 max-w-full cursor-pointer items-center gap-1 rounded-full border px-3 text-sm font-medium select-none pointer-coarse:min-h-11 data-focus:outline-2 data-focus:outline-offset-2 data-focus:outline-ink-blue-500",
					groupChipClasses[state]
				)}
			>
				{state === "all" && <TickIcon className="size-4 shrink-0" />}
				<span className="min-w-0 truncate">{group}</span>
				{/* The space keeps the name and count apart in the chip's text. */}
				{countText !== undefined && (
					<>
						{" "}
						<span className="shrink-0 font-normal">{countText}</span>
					</>
				)}
			</ListboxOption>
		);
	};
	/** An option's row, with any note, such as its group, muted after the label. */
	const renderOption = (option: SelectOption, note?: string): ReactNode => (
		<ListboxOption
			key={option.value}
			disabled={option.disabled}
			value={option.value}
			className={joinClassNames(
				"flex items-center justify-between gap-3 px-4 text-sm select-none pointer-coarse:min-h-11",
				option.description === undefined ? "h-10" : "min-h-10 py-1.5",
				option.disabled
					? "cursor-not-allowed text-neutral-500"
					: "cursor-pointer text-neutral-800 data-focus:bg-neutral-100"
			)}
		>
			{({ selected }) => (
				<>
					<RowText
						description={option.description}
						note={note}
						text={option.label}
					/>
					<span className="size-5 shrink-0">
						{props.multiple ? (
							selected ? (
								<CheckboxFilledIcon
									className={joinClassNames(
										"size-5",
										option.disabled ? "text-neutral-400" : "text-ink-blue-900"
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
										option.disabled ? "text-neutral-400" : "text-ink-blue-900"
									)}
								/>
							)
						)}
					</span>
				</>
			)}
		</ListboxOption>
	);
	return (
		<Listbox
			as="div"
			className="contents"
			defaultValue={selectAllLabel === undefined ? defaultValue : undefined}
			disabled={disabled}
			multiple={props.multiple}
			name={props.name}
			value={current}
			onChange={(nextValue: string | Array<string>) => {
				if (props.multiple && Array.isArray(nextValue)) {
					const wholeGroup = nextValue.find((chosen) =>
						chosen.startsWith(WHOLE_GROUP)
					);
					const next = wholeGroup
						? toggledGroup(wholeGroup.slice(WHOLE_GROUP.length))
						: nextValue.includes(SELECT_ALL)
							? options
									.filter((option) =>
										option.disabled
											? chosenValues.includes(option.value)
											: availableState !== "all"
									)
									.map((option) => option.value)
							: options
									.filter((option) => nextValue.includes(option.value))
									.map((option) => option.value);
					if (keepsOwnValue) setOwn(next);
					props.onChange?.(next);
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
												"cursor-pointer bg-white text-ink-blue-900",
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
						{/* Above every floating panel (z-60: Filters, date pickers, notifications), which can hold a Select. */}
						<ListboxOptions
							anchor={{ to: "bottom start", gap: 4 }}
							className="z-70 w-max min-w-(--button-width) overflow-y-auto rounded-lg border border-neutral-400 bg-white py-1 shadow-sm outline-hidden [--anchor-max-height:15.5rem]"
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
							{selectAllLabel !== undefined && options.length > 0 && (
								<ListboxOption
									className="mb-1 flex h-10 cursor-pointer items-center justify-between gap-3 border-b border-neutral-300 px-4 text-sm font-medium text-neutral-900 select-none data-focus:bg-neutral-100"
									disabled={available.length === 0}
									value={SELECT_ALL}
								>
									<span className="truncate">{selectAllLabel}</span>
									<span className="size-5 shrink-0">
										{stateIcon(availableState)}
									</span>
								</ListboxOption>
							)}
							{/* contain-inline-size: the chips wrap within the width the rows set and never widen the panel. */}
							{wholeGroups && choosableGroups.length > 0 && (
								<div
									aria-labelledby={groupsLabelId}
									className="mb-1 border-b border-neutral-300 px-4 pt-1 pb-3 contain-inline-size"
									role="group"
								>
									{groupsLabel !== undefined && (
										<div
											className="pb-2 text-xs font-medium text-neutral-600"
											id={groupsLabelId}
										>
											{groupsLabel}
										</div>
									)}
									<div className="flex flex-wrap gap-2">
										{choosableGroups.map(renderGroupChip)}
									</div>
								</div>
							)}
							{wholeGroups
								? options.map((option) =>
										renderOption(option, groupNoteOf(option))
									)
								: optionRuns(options).map((run, index) => {
										const key = `run-${String(index)}`;
										const headingId = `${groupId}-${String(index)}`;
										if (run.group === undefined)
											return (
												<Fragment key={key}>
													{run.options.map((option) => renderOption(option))}
												</Fragment>
											);
										return (
											<div key={key} aria-labelledby={headingId} role="group">
												<div
													className="px-4 pt-2 pb-1 text-xs font-semibold tracking-wide text-neutral-700 uppercase"
													id={headingId}
												>
													{run.group}
												</div>
												{run.options.map((option) => renderOption(option))}
											</div>
										);
									})}
						</ListboxOptions>
					</>
				);
			}}
		</Listbox>
	);
};
