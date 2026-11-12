import type {
	EmploymentTerms,
	MemberTerms,
	TermsOverview,
	TermsOverviewItem,
	TermsPresets,
	TermsReference,
} from "@/features/employmentTerms/api";

/** The part-time line the fixtures' company has: 35 h a week. */
export const PART_TIME_BELOW_MINUTES = 2100;

/** The figures the API reads terms against: 35 h line, 44 h full-time week, 12 h longest day. */
export const REFERENCE: TermsReference = {
	partTimeBelowMinutes: PART_TIME_BELOW_MINUTES,
	fullTimeWeekMinutes: 2640,
	maxNormalDayMinutes: 720,
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
	mostWeekMinutes: null,
	restDay: "ROSTERED",
	dailyOvertime: false,
	shiftWork: false,
	hoursLimitsApply: true,
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
	mostWeekMinutes: null,
	restDay: "SUN",
	dailyOvertime: true,
	shiftWork: false,
	hoursLimitsApply: true,
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
	mostWeekMinutes: null,
	restDay: "ROSTERED",
	dailyOvertime: false,
	shiftWork: true,
	hoursLimitsApply: true,
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
	mostWeekMinutes: null,
	restDay: "ROSTERED",
	dailyOvertime: true,
	shiftWork: false,
	hoursLimitsApply: true,
	holderCount: 9,
	scheduledCount: 0,
};

export const TERMS_OVERVIEW: TermsOverview = {
	terms: [STANDARD_WEEK, FIVE_DAY_WEEK, SIX_DAY_SHIFT, PART_TIME_20],
};

/** The presets route's answer: the country's figures and two common weeks (no figure lives in the app). */
export const TERMS_PRESETS: TermsPresets = {
	...REFERENCE,
	presets: [
		{
			key: "FIVE_DAY",
			name: "Five-day week, 44 h",
			daysPerWeek: 5,
			weekMinutes: 2640,
			dayMinutes: 528,
			mostWeekMinutes: null,
			restDay: "SUN",
			dailyOvertime: true,
			shiftWork: false,
			hoursLimitsApply: true,
		},
		{
			key: "SIX_DAY_SHIFT",
			name: "Six-day shift, 12 h",
			daysPerWeek: 6,
			weekMinutes: 2640,
			dayMinutes: 720,
			mostWeekMinutes: null,
			restDay: "ROSTERED",
			dailyOvertime: false,
			shiftWork: true,
			hoursLimitsApply: true,
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
		mostWeekMinutes: null,
		restDay: "ROSTERED",
		dailyOvertime: false,
		shiftWork: true,
		hoursLimitsApply: true,
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
		mostWeekMinutes: null,
		restDay: "ROSTERED",
		dailyOvertime: false,
		shiftWork: false,
		hoursLimitsApply: true,
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
