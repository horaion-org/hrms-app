import {
	apiRequest,
	apiRequestVoid,
	type RenewalOutcome,
} from "@/common/api-client";
import {
	ApiProblemError,
	UnreachableError,
	UnexpectedResponseError,
} from "@/common/problem";
import {
	logInOutcomeSchema,
	sessionTokensSchema,
	type LogInOutcome,
} from "@/features/auth/schemas";

export type ChallengeKind = Extract<
	LogInOutcome,
	{ kind: "challenge" }
>["challenge"];
export type ChallengeAnswer =
	{ code: string; newPassword?: never } | { newPassword: string; code?: never };

const SESSIONS = "/api/v1/public/sessions";
type SessionEndReason = "logged-out" | "logged-out-elsewhere" | "expired";
type Listener = (reason: SessionEndReason) => void;
type State =
	| { kind: "empty" }
	| { kind: "active"; token: string; expiresAt: number }
	| { kind: "logging-out" };

/** Memory only. A generation prevents late or queued work reviving an ended Session. */
class SessionHolder {
	private state: State = { kind: "empty" };
	private generation = 0;
	private challenge: ChallengeKind | null = null;
	private renewal: Promise<RenewalOutcome> | null = null;
	private retryRenewal = false;
	private timer: ReturnType<typeof setTimeout> | undefined;
	private readonly listeners = new Set<Listener>();
	private readonly channel =
		typeof BroadcastChannel === "undefined"
			? null
			: new BroadcastChannel("horaion.session");

	public constructor() {
		this.channel?.addEventListener(
			"message",
			(event: MessageEvent<unknown>) => {
				const data = event.data;
				if (
					typeof data === "object" &&
					data !== null &&
					"type" in data &&
					data.type === "logged-out"
				)
					this.end("logged-out-elsewhere");
			}
		);
	}

	public hasPass(): boolean {
		return (
			this.state.kind === "active" && Date.now() < this.state.expiresAt - 5000
		);
	}

	public async accessToken(): Promise<string | null> {
		if (this.state.kind === "active" && this.hasPass() && !this.retryRenewal)
			return this.state.token;
		const outcome = await this.renew();
		switch (outcome.kind) {
			case "renewed":
				return this.state.kind === "active" ? this.state.token : null;
			case "expired":
				return null;
			case "unreachable":
				throw new UnreachableError("Session renewal could not be reached");
			default: {
				const exhaustive: never = outcome;
				return exhaustive;
			}
		}
	}

	public pendingChallenge(): ChallengeKind | null {
		return this.challenge;
	}

	private hold(tokens: { accessToken: string; expiresIn: number }): void {
		this.retryRenewal = false;
		this.challenge = null;
		clearTimeout(this.timer);
		this.state = {
			kind: "active",
			token: tokens.accessToken,
			expiresAt: Date.now() + tokens.expiresIn * 1000,
		};
		// Short lifetimes renew halfway through instead of spinning at zero delay.
		this.timer = setTimeout(
			() => {
				void this.renew();
			},
			Math.max(tokens.expiresIn * 1000 - 60_000, tokens.expiresIn * 500)
		);
	}

	private async refresh(startedIn: number): Promise<RenewalOutcome> {
		if (startedIn !== this.generation) return { kind: "expired" };
		try {
			const tokens = await apiRequest(
				`${SESSIONS}/refreshes`,
				sessionTokensSchema,
				{ method: "POST", body: {}, anonymous: true }
			);
			if (startedIn !== this.generation) return { kind: "expired" };
			this.hold(tokens);
			return { kind: "renewed" };
		} catch (cause) {
			if (startedIn !== this.generation) return { kind: "expired" };
			if (
				cause instanceof ApiProblemError &&
				(cause.status === 401 || cause.errorCode === "SESSION_EXPIRED")
			) {
				this.end("expired");
				return { kind: "expired" };
			}
			return { kind: "unreachable" };
		}
	}

	public renew(): Promise<RenewalOutcome> {
		if (this.state.kind === "logging-out")
			return Promise.resolve({ kind: "expired" });
		if (this.renewal === null) {
			const startedIn = this.generation;
			const work = (): Promise<RenewalOutcome> => this.refresh(startedIn);
			const locked =
				typeof navigator !== "undefined" && navigator.locks
					? navigator.locks.request("horaion.session.renew", work)
					: work();
			const current = locked
				.catch((): RenewalOutcome => ({ kind: "unreachable" }))
				.then((outcome): RenewalOutcome => {
					if (startedIn !== this.generation) return { kind: "expired" };
					switch (outcome.kind) {
						case "unreachable":
							this.retryRenewal = true;
							// Retry on the next request or proactive tick, without a tight loop.
							if (this.state.kind === "active") {
								clearTimeout(this.timer);
								this.timer = setTimeout(() => {
									void this.renew();
								}, 30_000);
							}
							return outcome;
						case "renewed":
						case "expired":
							return outcome;
						default: {
							const exhaustive: never = outcome;
							return exhaustive;
						}
					}
				})
				.finally(() => {
					if (this.renewal === current) this.renewal = null;
				});
			this.renewal = current;
		}
		return this.renewal;
	}

	public listen(listener: Listener): () => void {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	}

	public end(reason: SessionEndReason): void {
		this.generation += 1;
		this.challenge = null;
		this.retryRenewal = false;
		this.state = { kind: "empty" };
		this.renewal = null;
		clearTimeout(this.timer);
		if (reason === "logged-out")
			this.channel?.postMessage({ type: "logged-out" });
		for (const listener of this.listeners) listener(reason);
	}

	public async logIn(email: string, password: string): Promise<LogInOutcome> {
		this.generation += 1;
		this.challenge = null;
		this.retryRenewal = false;
		const startedIn = this.generation;
		this.renewal = null;
		clearTimeout(this.timer);
		this.state = { kind: "empty" };
		const outcome = await apiRequest(SESSIONS, logInOutcomeSchema, {
			method: "POST",
			body: { email: email.trim(), password },
			anonymous: true,
		});
		if (startedIn !== this.generation)
			throw new UnexpectedResponseError("Session ended during Log in");
		this.acceptOutcome(outcome);
		return outcome;
	}

	private acceptOutcome(outcome: LogInOutcome): void {
		switch (outcome.kind) {
			case "session":
				this.hold(outcome);
				break;
			case "challenge":
				this.challenge = outcome.challenge;
				break;
			default: {
				const exhaustive: never = outcome;
				return exhaustive;
			}
		}
	}

	public async answerChallenge(answer: ChallengeAnswer): Promise<LogInOutcome> {
		const startedIn = this.generation;
		try {
			const outcome = await apiRequest(
				`${SESSIONS}/challenge`,
				logInOutcomeSchema,
				{
					method: "POST",
					body: answer,
					anonymous: true,
				}
			);
			if (startedIn !== this.generation)
				throw new UnexpectedResponseError("Session ended during Challenge");
			this.acceptOutcome(outcome);
			return outcome;
		} catch (cause) {
			if (
				startedIn === this.generation &&
				cause instanceof ApiProblemError &&
				cause.reason === "challenge-expired"
			)
				this.challenge = null;
			throw cause;
		}
	}

	public async logOut(): Promise<void> {
		this.generation += 1;
		this.challenge = null;
		this.retryRenewal = false;
		this.state = { kind: "logging-out" };
		clearTimeout(this.timer);
		try {
			await apiRequestVoid(SESSIONS, {
				method: "DELETE",
				body: {},
				anonymous: true,
			});
		} catch {
			// Local access is cleared even when the cookie route cannot be reached.
		} finally {
			this.end("logged-out");
		}
	}
}
const holder = new SessionHolder();
export const accessToken = (): Promise<string | null> => holder.accessToken();
export const hasAccessPass = (): boolean => holder.hasPass();
export const renewSession = (): Promise<RenewalOutcome> => holder.renew();
export const endSession = (reason: SessionEndReason): void => {
	holder.end(reason);
};
export const onSessionEnded = (listener: Listener): (() => void) =>
	holder.listen(listener);
export const logIn = (email: string, password: string): Promise<LogInOutcome> =>
	holder.logIn(email, password);
export const logOut = (): Promise<void> => holder.logOut();

export const pendingChallenge = (): ChallengeKind | null =>
	holder.pendingChallenge();
export const answerChallenge = (
	answer: ChallengeAnswer
): Promise<LogInOutcome> => holder.answerChallenge(answer);
