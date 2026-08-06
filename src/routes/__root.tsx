import { createRootRoute, Outlet } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/Toaster";
import type { FunctionComponent } from "@/common/types";

const RootLayout = (): FunctionComponent => {
	return (
		<>
			<Outlet />
			<Toaster />
		</>
	);
};

export const Route = createRootRoute({ component: RootLayout });
