import { useState, type AriaAttributes, type Ref } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Combobox } from "@/components/forms/Combobox";
import type { InputStatus } from "@/components/forms/Input";
import {
	availableTimeZones,
	matchesTimeZoneQuery,
	timeZoneOptions,
	viewerTimeZone,
} from "@/components/forms/TimeZoneSelect/timeZones";
import { Badge } from "@/components/ui/Badge";

export type TimeZoneSelectProps = {
	/** An IANA name, such as "Asia/Singapore", or "" when none is chosen. */
	value: string;
	onChange: (value: string) => void;
	/** Listed first; the browser's own zone unless given. */
	viewerZone?: string;
	status?: InputStatus;
	disabled?: boolean;
	id?: string;
	ref?: Ref<HTMLButtonElement>;
	"aria-label"?: string;
	"aria-describedby"?: string;
	"aria-invalid"?: AriaAttributes["aria-invalid"];
	"aria-required"?: AriaAttributes["aria-required"];
};

/** A searchable list of IANA time zones, each with its current offset and local time. */
export const TimeZoneSelect = ({
	value,
	onChange,
	viewerZone,
	...comboboxProps
}: TimeZoneSelectProps): FunctionComponent => {
	const { t } = useTranslation();
	const [query, setQuery] = useState("");
	// Built once when the field mounts: offsets and times hold still while it
	// is open, and the starting value stays listed even if the browser lacks it.
	const [options] = useState(() =>
		timeZoneOptions({
			zones: availableTimeZones(),
			now: new Date(),
			viewerZone: viewerZone ?? viewerTimeZone(),
			currentZone: value,
		})
	);
	return (
		<Combobox
			{...comboboxProps}
			virtual
			emptyText={t("timeZoneSelect.empty")}
			getKey={(option) => option.value}
			getLabel={(option) => option.label}
			multiple={false}
			options={options.filter((option) => matchesTimeZoneQuery(option, query))}
			placeholder={t("timeZoneSelect.placeholder")}
			query={query}
			searchPlaceholder={t("timeZoneSelect.search")}
			value={options.find((option) => option.value === value) ?? null}
			renderOption={(option) => (
				<span className="flex items-center justify-between gap-3">
					<span className="min-w-0 truncate">{option.label}</span>
					<span className="flex shrink-0 items-center gap-2 text-neutral-600">
						{option.isViewerZone && (
							<Badge className="normal-case">
								{t("timeZoneSelect.yourZone")}
							</Badge>
						)}
						<span className="hidden sm:inline">{option.localTime}</span>
					</span>
				</span>
			)}
			onQueryChange={setQuery}
			onChange={(option) => {
				onChange(option?.value ?? "");
			}}
		/>
	);
};
