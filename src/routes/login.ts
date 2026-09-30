import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { Login } from "@/pages/Login";
import { returnPath } from "@/features/auth/returnPath";
import { hasAccessPass } from "@/features/auth/session";
const searchSchema = z.object({
	challengeExpired: z.boolean().optional().catch(undefined),
	redirect: z.string().optional().catch(undefined),
	passwordReset: z.boolean().optional().catch(undefined),
});
export const Route = createFileRoute("/login")({
	validateSearch: (
		search
	): {
		redirect?: string;
		passwordReset?: boolean;
		challengeExpired?: boolean;
	} => {
		const { redirect, passwordReset, challengeExpired } =
			searchSchema.parse(search);
		return {
			...(redirect === undefined ? {} : { redirect: returnPath(redirect) }),
			...(passwordReset === undefined ? {} : { passwordReset }),
			...(challengeExpired === undefined ? {} : { challengeExpired }),
		};
	},
	beforeLoad: ({ search }) => {
		if (hasAccessPass()) return redirect({ href: returnPath(search.redirect) });
		return undefined;
	},
	component: Login,
});
