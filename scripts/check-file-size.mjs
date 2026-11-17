// Keeps files small enough to read in one sitting.
//
//   node scripts/check-file-size.mjs   fail on a source file over 500 lines or a test file over 1,500, unless it is
//                                      listed below and still within its ceiling, and on a listed file that is back
//                                      within the limit (so the list only shrinks)
//
// Stories, fixtures (`fixtures.ts`, `*Fixtures.ts`) and generated files (`*.gen.ts`, `*.generated.ts`) are exempt.
// Lines are counted as `wc -l` counts them.
import { fileURLToPath } from "node:url";
import { isTest, readSourceFiles, reportProblems } from "./sourceTree.mjs";

const SOURCE_LINE_LIMIT = 500;
const TEST_LINE_LIMIT = 1500;
const EXEMPT_FILE =
	/(\.stories\.tsx?|\/fixtures\.ts|Fixtures\.ts|\.gen\.ts|\.generated\.ts)$/;

/**
 * Files still over their limit, each with the line count it may not pass. This list only shrinks: split the file,
 * and once it is within the limit delete its line. A file that shrinks but stays over the limit passes as it is.
 * Never add a file or raise a ceiling; split the file instead.
 */
const LINE_CEILINGS = {
	"src/pages/CreateMonthSchedule.tsx": 966,
	"src/features/scheduling/schedules/api.ts": 1067,
	"src/features/scheduling/constraints/ConstraintDialog/ConstraintDialog.tsx": 1024,
	"src/features/employmentTerms/EmploymentTermsDialog/EmploymentTermsDialog.tsx": 954,
	"src/pages/ScheduleDetail.tsx": 854,
	"src/features/people/ProfileForm/ProfileForm.tsx": 849,
	"src/pages/CreateSchedule.tsx": 696,
	"src/features/leave/api.ts": 760,
	"src/features/scheduling/constraints/ConstraintsTab/ConstraintsTab.tsx": 748,
	"src/features/organisation/api.ts": 724,
	"src/features/scheduling/createSchedule/MonthSetupStep/MonthSetupStep.tsx": 675,
	"src/pages/ScheduleMonth.tsx": 658,
	// 620 lines today; the extra room is for the constraint type and field names docs/guides/add-a-constraint-type.md
	// adds here, one line each, until the schemas move to a file of their own.
	"src/features/scheduling/constraints/api.ts": 641,
	"src/features/employmentTerms/api.ts": 585,
	"src/components/ui/DataTable/DataTable.tsx": 576,
	"src/features/people/api.ts": 570,
	"src/pages/Leave.tsx": 527,
	"src/features/leave/LeaveRequestDialog/LeaveApplyForm/LeaveApplyForm.tsx": 514,
	"src/components/forms/Calendar/Calendar/Calendar.test.tsx": 3049,
	"src/features/scheduling/ScheduleDetail.test.tsx": 2610,
	"src/features/scheduling/CreateMonthSchedule.test.tsx": 2060,
	"src/features/scheduling/constraints/ConstraintDialog/ConstraintDialog.test.tsx": 1640,
};

/** The number of lines in a file's text, counting a last line without a newline. */
export const lineCount = (source) => {
	const pieces = source.split("\n");
	return source.endsWith("\n") ? pieces.length - 1 : pieces.length;
};

/** The line limit a file is held to, or undefined when it is exempt. */
export const lineLimitOf = (path) => {
	if (EXEMPT_FILE.test(path)) return undefined;
	return isTest(path) ? TEST_LINE_LIMIT : SOURCE_LINE_LIMIT;
};

/** The problem with one file's size, or undefined when it has none. */
export const sizeProblemOf = (path, lines, ceiling) => {
	const limit = lineLimitOf(path);
	if (limit === undefined) return undefined;
	if (ceiling === undefined)
		return lines > limit
			? `${path} has ${lines} lines, over the limit of ${limit}: split it into smaller files, each with one job`
			: undefined;
	if (lines > ceiling)
		return `${path} has ${lines} lines, over its ceiling of ${ceiling} in LINE_CEILINGS: split it rather than raise the ceiling`;
	if (lines <= limit)
		return `back within the limit of ${limit} lines, delete it from LINE_CEILINGS: ${path}`;
	return undefined;
};

/** The problems between the files' line counts and the listed ceilings. */
export const compare = (lineCounts, ceilings) => [
	...[...lineCounts]
		.map(([path, lines]) => sizeProblemOf(path, lines, ceilings[path]))
		.filter((problem) => problem !== undefined),
	...Object.keys(ceilings)
		.filter((path) => !lineCounts.has(path))
		.map((path) => `no longer exists, delete it from LINE_CEILINGS: ${path}`),
];

const main = async () => {
	const files = await readSourceFiles("src");
	const lineCounts = new Map(
		files.map(({ path, source }) => [path, lineCount(source)])
	);
	reportProblems("file size", compare(lineCounts, LINE_CEILINGS));
};

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
