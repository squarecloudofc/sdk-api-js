import { ApplicationLanguage } from "@squarecloud/api-types/v2";
import * as z from "zod";
import { SquareCloudAPIError } from "..";

const applicationSchema = z
	.object({
		id: z.string(),
		name: z.string(),
		desc: z.string().optional(),
		cluster: z.string(),
		ram: z.number(),
		language: z.nativeEnum(ApplicationLanguage),
		isWebsite: z.boolean(),
	})
	.passthrough();

const websiteApplicationSchema = applicationSchema
	.extend({
		isWebsite: z.literal(true),
		domain: z.string(),
		custom: z.string().nullable().optional(),
	})
	.passthrough();

export function assertApplication(
	value: unknown,
): asserts value is z.infer<typeof applicationSchema> {
	try {
		applicationSchema.parse(value);
	} catch {
		throw new SquareCloudAPIError(
			"INVALID_API_APPLICATION",
			"Invalid application object received from API /apps/{app_id}",
		);
	}
}

export function assertWebsiteApplication(
	value: unknown,
): asserts value is z.infer<typeof websiteApplicationSchema> {
	try {
		websiteApplicationSchema.parse(value);
	} catch {
		throw new SquareCloudAPIError(
			"INVALID_API_WEBSITE_APPLICATION",
			"Invalid website application object received from API /apps/{app_id}",
		);
	}
}
