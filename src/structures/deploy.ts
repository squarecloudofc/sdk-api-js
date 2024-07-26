import type { APIDeployment, DeploymentState } from "@squarecloud/api-types/v2";

import { assertDeployment } from "@/assertions/deploy";
import type { BaseApplication } from "./application/base";

export class Deployment {
	/** The ID of the deploy. */
	id: `git-${string}`;

	/** The current state of the deploy. */
	state: DeploymentState;

	/** The date the deploy was created. */
	createdAt: Date;

	/** The date the deploy was created in millisseconds. */
	createdTimestamp: number;

	constructor(
		public readonly application: BaseApplication,
		data: APIDeployment,
	) {
		assertDeployment(data);
		const { id, state, date } = data;

		this.id = id;
		this.state = state;
		this.createdAt = new Date(date);
		this.createdTimestamp = this.createdAt.getTime();
	}
}
