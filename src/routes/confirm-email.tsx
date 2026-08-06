import { createFileRoute, useSearch } from "@tanstack/react-router";
import type { FunctionComponent } from "@/common/types";
import { ConfirmEmailPage } from "@/features/auth/ConfirmEmailPage";

type ConfirmEmailSearch = { email: string };

const ConfirmEmailRoute = (): FunctionComponent => {
	const { email } = useSearch({ from: "/confirm-email" });

	return <ConfirmEmailPage email={email} />;
};

export const Route = createFileRoute("/confirm-email")({
	validateSearch: (search: Record<string, unknown>): ConfirmEmailSearch => ({
		email: typeof search["email"] === "string" ? search["email"] : "",
	}),
	component: ConfirmEmailRoute,
});
