import type { ReactNode } from "react";
import { joinClassNames } from "@/common/joinClassNames";

/** One problem the check found on a row, as both imports report it. */
export type CheckProblem = {
	code: string;
	/** The column the problem is about, or null for the whole row. */
	column: string | null;
	severity: "ERROR" | "SKIP" | "NOTICE";
};

/** A row of a check, as both imports report it: the values as uploaded and their problems. */
export type CheckRow<Problem extends CheckProblem> = {
	values: Partial<Record<string, string>>;
	problems: ReadonlyArray<Problem>;
};

/**
 * A check table's value cell. A value an error is about is outlined, so the
 * person sees where to fix.
 */
export const flaggedValueCell = <Problem extends CheckProblem>(
	row: CheckRow<Problem>,
	column: string
): ReactNode => {
	const flagged = row.problems.some(
		(problem) => problem.column === column && problem.severity === "ERROR"
	);
	return (
		<span
			data-flagged={flagged || undefined}
			className={joinClassNames(
				flagged && "rounded px-1 outline-2 outline-error-500"
			)}
		>
			{row.values[column] ?? ""}
		</span>
	);
};

/** A check table's problem cell: each problem worded, errors in red, or the "no problem" copy. */
export const problemsCell = <Problem extends CheckProblem>(
	problems: ReadonlyArray<Problem>,
	describe: (problem: Problem) => string,
	noProblem: string
): ReactNode =>
	problems.length === 0 ? (
		noProblem
	) : (
		<ul className="flex flex-col gap-1">
			{problems.map((problem) => (
				<li
					key={`${problem.code}:${problem.column ?? ""}`}
					className={joinClassNames(
						problem.severity === "ERROR" && "text-error-700"
					)}
				>
					{describe(problem)}
				</li>
			))}
		</ul>
	);
