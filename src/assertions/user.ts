import { ApplicationLanguage, UserPlanName } from "@squarecloud/api-types/v2";
import * as z from "zod";

import { assertAPIObject } from "./common";

const UserSchema = z
	.object({
		id: z.string(),
		name: z.string(),
		email: z.string(),
		plan: z.object({
			name: z.nativeEnum(UserPlanName),
			memory: z.object({
				limit: z.number(),
				available: z.number(),
				used: z.number(),
			}),
			duration: z.number().nullish(),
		}),
	})
	.passthrough();

const UserApplicationSchema = z
	.object({
		id: z.string(),
		name: z.string(),
		desc: z.string().nullish(),
		ram: z.number(),
		lang: z.nativeEnum(ApplicationLanguage),
		cluster: z.string(),
	})
	.passthrough();

const UserInfoSchema = z.object({
	user: UserSchema,
	applications: z.array(UserApplicationSchema),
});

export function assertUserInfo(
	value: unknown,
): asserts value is z.infer<typeof UserInfoSchema> {
	assertAPIObject({
		schema: UserInfoSchema,
		value,
		code: "USER_INFO",
		route: "/user",
	});
}
