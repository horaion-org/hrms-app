import {
	useMemo,
	useRef,
	useState,
	type AriaAttributes,
	type FocusEventHandler,
	type Ref,
} from "react";
import { useTranslation } from "react-i18next";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { Combobox } from "@/components/forms/Combobox";
import { Input, type InputStatus } from "@/components/forms/Input";
import { callingCodes } from "@/components/forms/PhoneInput/callingCodes";
import {
	formatPhone,
	parsePhone,
	type PhoneParts,
} from "@/components/forms/PhoneInput/PhoneInput.utils";
import { countryCodes, countryName } from "@/common/countries";

export type PhoneInputProps = {
	/** E.164, such as "+6583247931", or "" when no number is entered. */
	value: string;
	onChange: (value: string) => void;
	/** ISO 3166-1 alpha-2 region chosen while the field is empty, such as "SG". */
	defaultCountry?: string;
	/** For the number box, such as "8123 4567". */
	placeholder?: string;
	status?: InputStatus;
	disabled?: boolean;
	/** Set on the number box, so a FormRow label and `ref` focus it. */
	id?: string;
	name?: string;
	className?: string;
	ref?: Ref<HTMLInputElement>;
	onBlur?: FocusEventHandler<HTMLInputElement>;
	"aria-labelledby"?: string;
	"aria-describedby"?: string;
	"aria-invalid"?: AriaAttributes["aria-invalid"];
	"aria-required"?: AriaAttributes["aria-required"];
};

type Country = { code: string; name: string; callingCode: string };

/** A country calling code and a national number, reported together as one E.164 value. */
export const PhoneInput = ({
	value,
	onChange,
	defaultCountry,
	placeholder,
	status,
	disabled,
	id,
	name,
	className,
	ref,
	onBlur,
	"aria-labelledby": ariaLabelledby,
	"aria-describedby": ariaDescribedby,
	"aria-invalid": ariaInvalid,
	"aria-required": ariaRequired,
}: PhoneInputProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const group = useRef<HTMLDivElement>(null);
	const [query, setQuery] = useState("");
	const [parts, setParts] = useState(() => parsePhone(value, defaultCountry));
	// The shown parts are re-read only when the value changes from outside,
	// so a typed space or a chosen country that shares a code survives.
	const [seenValue, setSeenValue] = useState(value);
	if (value !== seenValue) {
		setSeenValue(value);
		if (value !== formatPhone(parts))
			setParts(parsePhone(value, defaultCountry));
	}
	// A default that arrives or changes later is adopted until the person
	// chooses a country or types a number.
	const [chose, setChose] = useState(false);
	const [seenDefault, setSeenDefault] = useState(defaultCountry);
	if (defaultCountry !== seenDefault) {
		setSeenDefault(defaultCountry);
		if (!chose && parts.national === "")
			setParts(parsePhone("", defaultCountry));
	}
	const countries = useMemo(
		() =>
			countryCodes
				.flatMap((code): Array<Country> => {
					const callingCode = callingCodes[code];
					return callingCode
						? [{ code, name: countryName(code, i18n.language), callingCode }]
						: [];
				})
				.sort((a, b) => a.name.localeCompare(b.name, i18n.language)),
		[i18n.language]
	);
	const search = query.trim().toLocaleLowerCase(i18n.language);
	// Digits, with or without "+", search by code; anything else by name.
	const codeSearch = /^\+?\d*$/.test(search) ? search.replace("+", "") : null;
	const chosen = countries.find((country) => country.code === parts.region);
	const update = (next: PhoneParts): void => {
		setParts(next);
		const nextValue = formatPhone(next);
		if (nextValue !== value) onChange(nextValue);
	};
	return (
		<div
			ref={group}
			aria-labelledby={ariaLabelledby}
			className={joinClassNames("flex gap-3", className)}
			role="group"
		>
			<Combobox
				aria-describedby={ariaDescribedby}
				className="w-28 shrink-0"
				disabled={disabled}
				formatValue={(country) => country.callingCode}
				getKey={(country) => country.code}
				getLabel={(country) => `${country.name} ${country.callingCode}`}
				multiple={false}
				panelAnchor={group}
				placeholder={t("phoneInput.countryPlaceholder")}
				query={query}
				searchPlaceholder={t("phoneInput.searchCountries")}
				status={status}
				value={chosen ?? null}
				aria-label={
					chosen
						? t("phoneInput.countryCodeValue", {
								country: `${chosen.name} ${chosen.callingCode}`,
							})
						: t("phoneInput.countryCode")
				}
				options={countries.filter((country) =>
					codeSearch === null
						? country.name.toLocaleLowerCase(i18n.language).includes(search)
						: country.callingCode.slice(1).startsWith(codeSearch)
				)}
				renderOption={(country) => (
					<span className="flex items-center justify-between gap-3">
						<span className="min-w-0">{country.name}</span>
						<span className="shrink-0 text-neutral-600">
							{country.callingCode}
						</span>
					</span>
				)}
				onQueryChange={setQuery}
				onChange={(country) => {
					setChose(true);
					update({ ...parts, region: country?.code ?? null });
				}}
			/>
			<Input
				ref={ref}
				aria-describedby={ariaDescribedby}
				aria-invalid={ariaInvalid}
				aria-label={ariaLabelledby ? undefined : t("phoneInput.number")}
				aria-labelledby={ariaLabelledby}
				aria-required={ariaRequired}
				autoComplete="tel-national"
				className="min-w-0 flex-1"
				disabled={disabled}
				id={id}
				inputMode="tel"
				name={name}
				placeholder={placeholder}
				status={status}
				type="tel"
				value={parts.national}
				onBlur={onBlur}
				onChange={(event) => {
					// Only digits and spaces are kept; spaces never reach the value.
					update({
						...parts,
						national: event.target.value.replace(/[^\d ]/g, ""),
					});
				}}
			/>
		</div>
	);
};
