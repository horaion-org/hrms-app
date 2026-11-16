import type { TFunction } from "i18next";
import type { ScheduleGeneration } from "@/features/scheduling/schedules/api";

/*
 * Why a schedule wasn't generated, in the app's own words. The codes are the
 * closed set of §2 of the API's `docs/implementation/2026-10-27-roster-read-model.md`;
 * the engine may add codes, so one the app doesn't know reads generically and
 * the code itself is still shown.
 */

const KNOWN_CODES = [
	"engine_unreachable",
	"result_unmappable",
	"FAILED",
	"CANCELLED",
	"job_not_finished",
	"job_failed",
	"result_expired",
	"idempotency_key_required",
	"idempotency_conflict",
	"payload_too_large",
	"snapshot_invalid",
	"too_many_jobs",
	"job_not_found",
	"unauthorized",
	"forbidden",
	"worker_failed",
	"worker_crashed",
	"rule.soft_not_allowed",
	"rule.days_not_worked_together_not_supported",
] as const;

type KnownCode = (typeof KNOWN_CODES)[number];

const isKnownCode = (code: string): code is KnownCode =>
	(KNOWN_CODES as ReadonlyArray<string>).includes(code);

/** `engine_http_503`: the engine answered with an HTTP error; the code line shows the status. */
const ENGINE_HTTP_CODE = /^engine_http_\d{3}$/;

const key = "scheduling.generation";

/** Copy for one error code: its own, the engine's HTTP error, or the generic fallback. */
const codeMessage = (code: string, t: TFunction): string => {
	if (isKnownCode(code)) return t(`${key}.errorCodes.${code}`);
	if (ENGINE_HTTP_CODE.test(code)) return t(`${key}.errorCodes.engine_http`);
	return t(`${key}.failed`);
};

/**
 * What `generationFailure` reads of a run: a schedule's generation, or a
 * month week's `failure` (whose run status is `runStatus` there).
 */
export type FailedRun = Pick<
	ScheduleGeneration,
	"errorCode" | "engineOutcome"
> & {
	status: string;
	findings?: ScheduleGeneration["findings"];
};

/** What the failure panel says, and the code to show beside it when there is one. */
export type GenerationFailure = { message: string; code: string | null };

/**
 * Why the newest run didn't produce a roster. A run's `errorCode` explains it
 * only once the run FAILED (a run that retried and then succeeded keeps its
 * last code). A run that succeeded but found no roster meeting every rule is
 * INFEASIBLE. Anything else reads as a plain failure.
 */
export const generationFailure = (
	generation: FailedRun | null,
	t: TFunction
): GenerationFailure => {
	if (generation?.status === "FAILED" && generation.errorCode !== null)
		return {
			message: codeMessage(generation.errorCode, t),
			code: generation.errorCode,
		};
	if (
		generation?.engineOutcome === "INFEASIBLE" ||
		generation?.findings?.scheduleStatus === "INFEASIBLE"
	)
		return { message: t(`${key}.infeasible`), code: null };
	return { message: t(`${key}.failed`), code: null };
};
