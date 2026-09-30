import { render, type RenderResult } from "@testing-library/react";
import { RouterProvider } from "@tanstack/react-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { I18nextProvider } from "react-i18next";
import { authTestI18n } from "@/features/auth/testingI18n";
import type { OpenedApp } from "@/common/testing/openApp";

/** Real routes, with bundled English confined to tests. */
export const renderAuthApp = ({
	router,
	queryClient,
}: OpenedApp): RenderResult =>
	render(
		<I18nextProvider i18n={authTestI18n}>
			<QueryClientProvider client={queryClient}>
				<RouterProvider router={router} />
			</QueryClientProvider>
		</I18nextProvider>
	);
