import { ApplicationLanguage } from "@squarecloud/api-types/v2";
import * as z from "zod";

import { assertAPIObject } from "./common";

const ApplicationSchema = z.object({
	id: z.string(),
	name: z.string(),
	desc: z.string().nullish(),
	cluster: z.string(),
	ram: z.number(),
	language: z.nativeEnum(ApplicationLanguage),
});

const WebsiteApplicationSchema = ApplicationSchema.extend({
	domain: z.string(),
	custom: z.string().nullish(),
});

export function assertApplication(
	value: unknown,
): asserts value is z.infer<typeof ApplicationSchema> {
	assertAPIObject({
		schema: ApplicationSchema,
		value,
		code: "APPLICATION",
		route: "/apps/{app_id}",
	});
}

export function assertWebsiteApplication(
	value: unknown,
): asserts value is z.infer<typeof WebsiteApplicationSchema> {
	assertAPIObject({
		schema: WebsiteApplicationSchema,
		value,
		code: "WEBSITE_APPLICATION",
		route: "/apps/{app_id}",
	});
}
