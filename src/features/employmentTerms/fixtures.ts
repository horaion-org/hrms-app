import type {
	EmploymentTerms,
	PayFields,
	MemberTerms,
	TermsOverview,
	TermsOverviewItem,
	TermsPresets,
	TermsReference,
} from "@/features/employmentTerms/api";

/** The part-time line the fixtures' company has: 35 h a week. */
export const PART_TIME_BELOW_MINUTES = 2100;

/** The figures the API reads terms against: 35 h line, 44 h full-time week, 12 h longest day, the Act's rates. */
export const REFERENCE: TermsReference = {
	partTimeBelowMinutes: PART_TIME_BELOW_MINUTES,
	fullTimeWeekMinutes: 2640,
	maxNormalDayMinutes: 720,
	minimumCoveredOvertimePercent: 150,
	usualRestDayWorkPercent: 200,
	timeOffPerExtraHourPercent: 100,
	coveredPayLines: {
		currency: "SGD",
		workmanMonthly: 4500,
		otherStaffMonthly: 2600,
	},
};

/** What new terms pay: overtime at 1.5 times, rest day work at 2, a day off as normal hours, paid at a rate. */
export const DEFAULT_PAY: PayFields = {
	overtimePercent: 150,
	restDayWorkPercent: 200,
	dayOffWorkPercent: null,
	extraHoursPaidAs: "RATE",
};

/** The seeded Default: 6 days, 44 h, a rest day set on the roster. */
export const STANDARD_WEEK: TermsOverviewItem = {
	id: "terms-standard",
	name: "Standard week",
	description: null,
	status: "ACTIVE",
	isDefault: true,
	daysPerWeek: 6,
	weekMinutes: 2640,
	dayMinutes: null,
	restDay: "ROSTERED",
	dailyOvertime: false,
	shiftWork: false,
	hoursLimitsApply: true,
	...DEFAULT_PAY,
	// Everyone is backfilled onto the Default, so it is held like any terms.
	holderCount: 64,
	scheduledCount: 0,
};

export const FIVE_DAY_WEEK: TermsOverviewItem = {
	id: "terms-five-day",
	name: "Five-day week, 44 h",
	description: "Office and supervisors",
	status: "ACTIVE",
	isDefault: false,
	daysPerWeek: 5,
	weekMinutes: 2640,
	dayMinutes: 528,
	restDay: "SUN",
	dailyOvertime: true,
	shiftWork: false,
	hoursLimitsApply: true,
	...DEFAULT_PAY,
	holderCount: 0,
	scheduledCount: 0,
};

export const SIX_DAY_SHIFT: TermsOverviewItem = {
	id: "terms-six-day-shift",
	name: "Six-day shift, 12 h",
	description: null,
	status: "ACTIVE",
	isDefault: false,
	daysPerWeek: 6,
	weekMinutes: 2640,
	dayMinutes: 720,
	restDay: "ROSTERED",
	dailyOvertime: false,
	shiftWork: true,
	hoursLimitsApply: true,
	...DEFAULT_PAY,
	holderCount: 41,
	scheduledCount: 2,
};

export const PART_TIME_20: TermsOverviewItem = {
	id: "terms-part-time",
	name: "Part-time, 20 h",
	description: null,
	status: "INACTIVE",
	isDefault: false,
	daysPerWeek: null,
	weekMinutes: 1200,
	dayMinutes: 240,
	restDay: "ROSTERED",
	dailyOvertime: true,
	shiftWork: false,
	hoursLimitsApply: true,
	...DEFAULT_PAY,
	holderCount: 9,
	scheduledCount: 0,
};

export const TERMS_OVERVIEW: TermsOverview = {
	terms: [STANDARD_WEEK, FIVE_DAY_WEEK, SIX_DAY_SHIFT, PART_TIME_20],
};

/** The presets route's answer: the country's figures and the five starting points (no figure lives in the app). */
export const TERMS_PRESETS: TermsPresets = {
	...REFERENCE,
	presets: [
		{
			key: "FULL_TIME_5_DAYS",
			name: "Full-time, 5 days",
			daysPerWeek: 5,
			weekMinutes: 2640,
			dayMinutes: 528,
			restDay: "SUN",
			dailyOvertime: true,
			shiftWork: false,
			hoursLimitsApply: true,
			...DEFAULT_PAY,
		},
		{
			key: "FULL_TIME_5_AND_HALF_DAYS",
			name: "Full-time, 5½ days",
			daysPerWeek: 5.5,
			weekMinutes: 2640,
			dayMinutes: 480,
			restDay: "SUN",
			dailyOvertime: true,
			shiftWork: false,
			hoursLimitsApply: true,
			...DEFAULT_PAY,
		},
		{
			key: "FULL_TIME_6_DAYS",
			name: "Full-time, 6 days",
			daysPerWeek: 6,
			weekMinutes: 2640,
			dayMinutes: 440,
			restDay: "ROSTERED",
			dailyOvertime: false,
			shiftWork: false,
			hoursLimitsApply: true,
			...DEFAULT_PAY,
		},
		{
			key: "PART_TIME_20_H",
			name: "Part-time, 20 h",
			daysPerWeek: null,
			weekMinutes: 1200,
			dayMinutes: null,
			restDay: "ROSTERED",
			dailyOvertime: false,
			shiftWork: false,
			hoursLimitsApply: true,
			...DEFAULT_PAY,
		},
		{
			key: "MANAGERS",
			name: "Managers and executives",
			daysPerWeek: 5,
			weekMinutes: 2640,
			dayMinutes: 528,
			restDay: "SUN",
			dailyOvertime: false,
			shiftWork: false,
			hoursLimitsApply: false,
			...DEFAULT_PAY,
			extraHoursPaidAs: "NOTHING",
		},
	],
};

/** The overview route's body: each terms with its counts beside it. */
export const overviewResponse = (
	items: ReadonlyArray<TermsOverviewItem>
): unknown => ({
	terms: items.map(({ holderCount, scheduledCount, ...terms }) => ({
		terms,
		holderCount,
		scheduledCount,
	})),
});

export const TERMS_OVERVIEW_RESPONSE = overviewResponse(TERMS_OVERVIEW.terms);

/** The pickers' list route's body: terms and the reference figures (extra fields are ignored on read). */
export const termsListResponse = (
	terms: ReadonlyArray<EmploymentTerms>
): unknown => ({ terms, reference: REFERENCE });

/** A person on Six-day shift since 1 Mar 2025, moving to the Five-day week from 5 Jan 2027. */
export const MEMBER_TERMS: MemberTerms = {
	inForce: {
		termsId: SIX_DAY_SHIFT.id,
		name: SIX_DAY_SHIFT.name,
		basis: "ASSIGNED",
		daysPerWeek: 6,
		weekMinutes: 2640,
		dayMinutes: 720,
		restDay: "ROSTERED",
		dailyOvertime: false,
		shiftWork: true,
		hoursLimitsApply: true,
		...DEFAULT_PAY,
		contractedWeekMinutes: null,
		contractedDayMinutes: null,
		since: "2025-03-01",
	},
	mismatch: null,
	history: [
		{
			id: "entry-upcoming",
			effectiveFrom: "2027-01-04",
			termsId: FIVE_DAY_WEEK.id,
			termsName: FIVE_DAY_WEEK.name,
			contractedWeekMinutes: null,
			contractedDayMinutes: null,
			source: "MANUAL",
			recordedBy: { displayName: "Lee Mei" },
			recordedAt: "2026-11-05T09:30:00Z",
			scheduled: true,
		},
		{
			id: "entry-first",
			effectiveFrom: "2025-03-01",
			termsId: SIX_DAY_SHIFT.id,
			termsName: SIX_DAY_SHIFT.name,
			contractedWeekMinutes: null,
			contractedDayMinutes: null,
			source: "IMPORT",
			recordedBy: null,
			recordedAt: "2026-11-04T02:00:00Z",
			scheduled: false,
		},
	],
	reference: REFERENCE,
};

/** Someone already in Horaion when terms were introduced: backfilled onto the Default. */
export const MEMBER_ON_STANDARD: MemberTerms = {
	inForce: {
		termsId: STANDARD_WEEK.id,
		name: STANDARD_WEEK.name,
		basis: "ASSIGNED",
		daysPerWeek: 6,
		weekMinutes: 2640,
		dayMinutes: null,
		restDay: "ROSTERED",
		dailyOvertime: false,
		shiftWork: false,
		hoursLimitsApply: true,
		...DEFAULT_PAY,
		contractedWeekMinutes: null,
		contractedDayMinutes: null,
		since: "2024-06-03",
	},
	mismatch: null,
	history: [
		{
			id: "entry-backfill",
			effectiveFrom: "2024-06-03",
			termsId: STANDARD_WEEK.id,
			termsName: STANDARD_WEEK.name,
			contractedWeekMinutes: null,
			contractedDayMinutes: null,
			source: "BACKFILL",
			recordedBy: null,
			recordedAt: "2026-11-05T00:00:00Z",
			scheduled: false,
		},
	],
	reference: REFERENCE,
};
