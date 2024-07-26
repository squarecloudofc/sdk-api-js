import { DeploymentState } from "@squarecloud/api-types/v2";
import { z } from "zod";

import { assertAPIObject } from "./common";

const DeploymentSchema = z.object({
	id: z.string(),
	state: z.nativeEnum(DeploymentState),
	date: z.coerce.date(),
});

export function assertDeployment(
	value: unknown,
): asserts value is z.infer<typeof DeploymentSchema> {
	assertAPIObject({
		schema: DeploymentSchema,
		value,
		code: "DEPLOYMENT",
		route: "/apps/{app_id}/deployments",
	});
}
