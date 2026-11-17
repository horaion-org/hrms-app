import { useQueryClient } from "@tanstack/react-query";
import type { ParseKeys } from "i18next";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Toast } from "@/components/ui/Toast";

declare module "@tanstack/react-query" {
	interface Register {
		mutationMeta: {
			/**
			 * Translation key of the confirmation. Without one (or `false`, when
			 * the action presents its own confirmation) nothing is announced.
			 */
			successMessage?: ParseKeys | false;
		};
	}
}

/**
 * The app's one success toast, outside the router so a confirmation
 * survives navigation. The newest message replaces the one on screen at
 * once and gets its own full time, so a confirmation never shows late,
 * behind older ones.
 */
export const SuccessNotifications = (): FunctionComponent => {
	const client = useQueryClient();
	const { t } = useTranslation();
	const nextId = useRef(0);
	const [current, setCurrent] = useState<{ id: number; key: ParseKeys }>();

	useEffect(
		() =>
			client.getMutationCache().subscribe((event) => {
				if (event.type !== "updated" || event.action.type !== "success") return;
				const key = event.mutation.meta?.successMessage;
				if (!key) return;
				setCurrent({ id: nextId.current++, key });
			}),
		[client]
	);

	return current ? (
		// A new key restarts the toast: its own time, announced once.
		<Toast
			key={current.id}
			onDismiss={() => {
				setCurrent((shown) => (shown?.id === current.id ? undefined : shown));
			}}
		>
			{t(current.key)}
		</Toast>
	) : null;
};
