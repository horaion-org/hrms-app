import { createFileRoute } from "@tanstack/react-router";
import { NotFound } from "@/pages/NotFound";

/**
 * Any address no other route answers, caught inside the app layout so the
 * menu stays visible; signed out, the layout sends the person to sign in.
 */
export const Route = createFileRoute("/_authenticated/_app/$")({
	component: NotFound,
});
