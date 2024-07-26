import { z } from "zod";

import { assertAPIObject } from "./common";

const BackupSchema = z.object({
	name: z.string(),
	size: z.number(),
	modified: z.coerce.date(),
	key: z.string(),
});

export function assertBackup(
	value: unknown,
): asserts value is z.infer<typeof BackupSchema> {
	assertAPIObject({
		schema: BackupSchema,
		value,
		code: "BACKUP",
		route: "/apps/{app_id}/backups",
	});
}
