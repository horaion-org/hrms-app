import { useQueryClient } from "@tanstack/react-query";
import type { ParseKeys } from "i18next";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Toast } from "@/components/ui/Toast";

declare module "@tanstack/react-query" {
	interface Register {
		mutationMeta: {
			/** Translation key; false when the action already presents its own confirmation. */
			successMessage?: ParseKeys | false;
		};
	}
}

/** One app-level queue, outside the router so successful actions survive navigation. */
export const SuccessNotifications = (): FunctionComponent => {
	const client = useQueryClient();
	const { t } = useTranslation();
	const nextId = useRef(0);
	const [messages, setMessages] = useState<Array<{ id: number; key: ParseKeys }>>(
		[]
	);

	useEffect(
		() =>
			client.getMutationCache().subscribe((event) => {
				if (event.type !== "updated" || event.action.type !== "success") return;
				const key = event.mutation.meta?.successMessage;
				if (key === false) return;
				const message = {
					id: nextId.current++,
					key: key ?? "notifications.operationSucceeded",
				};
				setMessages((previous) => [...previous, message]);
			}),
		[client]
	);

	const current = messages[0];
	return current ? (
		<Toast
			key={current.id}
			onDismiss={() => {
				setMessages((previous) =>
					previous.filter(({ id }) => id !== current.id)
				);
			}}
		>
			{t(current.key)}
		</Toast>
	) : null;
};
