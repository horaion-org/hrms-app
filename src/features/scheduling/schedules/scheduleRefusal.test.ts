import { describe, expect, it } from "vitest";
import { ApiProblemError } from "@/common/problem";
import { authTestI18n } from "@/features/auth/testingI18n";
import {
	datesGenerationRefusal,
	datesRefusalText,
	refusalOfCode,
	scheduleRefusalMessage,
} from "@/features/scheduling/schedules/scheduleRefusal";

const t = authTestI18n.t;

/** An API refusal with its status and code. */
const problem = (status: number, errorCode: string): ApiProblemError =>
	new ApiProblemError({
		status,
		errorCode,
		fieldErrors: [],
		reason: "http",
		message: errorCode,
	});

const MEMBER_GONE =
	"Someone you chose can no longer be rostered in this department, so nothing was created. Go back to Setup and choose the people again.";
const PEOPLE_DAYS_TAKEN =
	"These days already have a schedule. Choose days with no schedule, or roster everyone.";

describe("chosen people refusals (API ADR-0136)", () => {
	it.each([
		[404, "SCHEDULE_MEMBER_NOT_FOUND", MEMBER_GONE],
		[409, "SCHEDULE_PEOPLE_DAYS_TAKEN", PEOPLE_DAYS_TAKEN],
	])(
		"words a %i %s on generating dates with what to do",
		(status, code, copy) => {
			expect(datesGenerationRefusal(problem(status, code), t)).toBe(copy);
		}
	);

	it.each([
		[404, "SCHEDULE_MEMBER_NOT_FOUND", MEMBER_GONE],
		[409, "SCHEDULE_PEOPLE_DAYS_TAKEN", PEOPLE_DAYS_TAKEN],
	])(
		"words a %i %s on saving the dates' first draft with what to do",
		(status, code, copy) => {
			expect(scheduleRefusalMessage(problem(status, code), true, t)).toBe(copy);
		}
	);

	it("words a week refused because none of its chosen people is left", () => {
		expect(refusalOfCode("SCHEDULE_CHOSEN_PEOPLE_GONE", t)).toBe(
			"None of the people chosen for this schedule can be rostered any more. Delete this schedule and schedule its days again with people of the department."
		);
	});
});

describe("datesRefusalText: every asked day taken", () => {
	const refusal = {
		code: "SCHEDULE_DAYS_ALL_TAKEN",
		days: { from: "2026-11-19", to: "2026-11-22" },
		scheduledDays: null,
	};

	it.each([
		{
			case: "all published",
			withdrawn: [],
			copy: /^Every day from Thu,? Nov 19 to Sun,? Nov 22 has been published, so nothing would change\./,
		},
		{
			case: "all withdrawn",
			withdrawn: [{ from: "2026-11-19", to: "2026-11-22" }],
			copy: /^Nov 19\s?–\s?22, 2026 were published and then withdrawn, so generating leaves them as they are\. To work them out again, delete them first/,
		},
		{
			case: "some published, one day withdrawn",
			withdrawn: [{ from: "2026-11-22", to: "2026-11-22" }],
			copy: /^Nov 22, 2026 was published and then withdrawn, so generating leaves it as it is\. To work it out again, delete it first/,
		},
	])(
		"given_$case_when_worded_then_saysWhatIsTrueOfThoseDays",
		({ withdrawn, copy }) => {
			expect(datesRefusalText(refusal, t, "en-US", withdrawn)).toMatch(copy);
		}
	);
});
