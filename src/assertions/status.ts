import { ApplicationStatus } from "@squarecloud/api-types/v2";
import * as z from "zod";

import { handleAPIObjectAssertion } from "./common";

const simpleStatusSchema = z
	.object({
		id: z.string(),
		cpu: z.string(),
		ram: z.string(),
		running: z.literal(true),
	})
	.passthrough()
	.or(
		z
			.object({
				id: z.string(),
				running: z.literal(false),
			})
			.passthrough(),
	);

const statusSchema = z
	.object({
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
		uptime: z.number().nullable().optional(),
	})
	.passthrough();

export function assertSimpleStatus(
	value: unknown,
): asserts value is z.infer<typeof simpleStatusSchema> {
	handleAPIObjectAssertion({
		schema: simpleStatusSchema,
		value,
		code: "STATUS_ALL",
		route: "/apps/all/status",
	});
}

export function assertStatus(
	value: unknown,
): asserts value is z.infer<typeof statusSchema> {
	handleAPIObjectAssertion({
		schema: statusSchema,
		value,
		code: "STATUS",
		route: "/apps/{app_id}/status",
	});
}
