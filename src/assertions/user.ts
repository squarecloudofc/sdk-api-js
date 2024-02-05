import { ApplicationLanguage, UserPlanName } from "@squarecloud/api-types/v2";
import * as z from "zod";
import { SquareCloudAPIError } from "..";

const userSchema = z
  .object({
    id: z.string(),
    tag: z.string(),
    locale: z.string(),
    email: z.string(),
    plan: z.object({
      name: z.nativeEnum(UserPlanName),
      memory: z.object({
        limit: z.number(),
        available: z.number(),
        used: z.number(),
      }),
      duration: z.number().nullable(),
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

export function assertUserInfo(value: unknown): asserts value is z.infer<typeof userInfoSchema> {
  try {
    userInfoSchema.parse(value);
  } catch {
    throw new SquareCloudAPIError("INVALID_API_USER_INFO", "Invalid user info object received from API /user");
  }
}
