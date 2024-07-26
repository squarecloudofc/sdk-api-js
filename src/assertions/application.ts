import { ApplicationLanguage } from "@squarecloud/api-types/v2";
import * as z from "zod";

import { handleAPIObjectAssertion } from "./common";

const applicationSchema = z
	.object({
		id: z.string(),
		name: z.string(),
		desc: z.string().optional(),
		cluster: z.string(),
		ram: z.number(),
		language: z.nativeEnum(ApplicationLanguage),
	})
	.passthrough();

const websiteApplicationSchema = applicationSchema
	.extend({
		domain: z.string(),
		custom: z.string().nullable().optional(),
	})
	.passthrough();

export function assertApplication(
	value: unknown,
): asserts value is z.infer<typeof applicationSchema> {
	handleAPIObjectAssertion({
		schema: applicationSchema,
		value,
		code: "APPLICATION",
		route: "/apps/{app_id}",
	});
}

export function assertWebsiteApplication(
	value: unknown,
): asserts value is z.infer<typeof websiteApplicationSchema> {
	handleAPIObjectAssertion({
		schema: websiteApplicationSchema,
		value,
		code: "WEBSITE_APPLICATION",
		route: "/apps/{app_id}",
	});
}
