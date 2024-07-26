import { ApplicationStatus } from "@squarecloud/api-types/v2";
import * as z from "zod";

import { assertAPIObject } from "./common";

const SimpleStatusSchema = z
	.object({
		id: z.string(),
		cpu: z.string(),
		ram: z.string(),
		running: z.literal(true),
	})
	.or(
		z.object({
			id: z.string(),
			running: z.literal(false),
		}),
	);

const StatusSchema = z.object({
	cpu: z.string(),
	ram: z.string(),
	status: z.nativeEnum(ApplicationStatus),
	running: z.boolean(),
	storage: z.string(),
	network: z.object({
		total: z.string(),
		now: z.string(),
	}),
	requests: z.number(),
	uptime: z.number().nullish(),
});

export function assertSimpleStatus(
	value: unknown,
): asserts value is z.infer<typeof SimpleStatusSchema> {
	assertAPIObject({
		schema: SimpleStatusSchema,
		value,
		code: "STATUS_ALL",
		route: "/apps/all/status",
	});
}

export function assertStatus(
	value: unknown,
): asserts value is z.infer<typeof StatusSchema> {
	assertAPIObject({
		schema: StatusSchema,
		value,
		code: "STATUS",
		route: "/apps/{app_id}/status",
	});
}
