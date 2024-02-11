import { ApplicationLanguage, UserPlanName } from "@squarecloud/api-types/v2";
import * as z from "zod";
import { handleAPIObjectAssertion } from "./common";

const userSchema = z
	.object({
		id: z.string(),
		tag: z.string(),
		email: z.string(),
		plan: z.object({
			name: z.nativeEnum(UserPlanName),
			memory: z.object({
				limit: z.number(),
				available: z.number(),
				used: z.number(),
			}),
			duration: z.number().nullable().optional(),
		}),
	})
	.passthrough();

const userApplicationSchema = z
	.object({
		id: z.string(),
		tag: z.string(),
		desc: z.string().optional(),
		ram: z.number(),
		lang: z.nativeEnum(ApplicationLanguage),
		cluster: z.string(),
		isWebsite: z.boolean(),
	})
	.passthrough();

const userInfoSchema = z.object({
	user: userSchema,
	applications: z.array(userApplicationSchema),
});

export function assertUserInfo(
	value: unknown,
): asserts value is z.infer<typeof userInfoSchema> {
	handleAPIObjectAssertion({
		schema: userInfoSchema,
		value,
		code: "USER_INFO",
		route: "/user",
	});
}
