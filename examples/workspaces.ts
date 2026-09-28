import { SquareCloudAPI } from "@squarecloud/api";

const api = new SquareCloudAPI(process.env.SQUARECLOUD_API_KEY ?? "");
const appId = process.argv[2] ?? "";

const { id: workspaceId } = await api.workspaces.create("My team");
try {
	// Share an app; it is addressed as `${appId}-${workspaceId}` through the workspace
	await api.workspaces.apps.add(workspaceId, appId);
	console.log((await api.apps.status(`${appId}-${workspaceId}`)).running);

	// To join someone else's workspace, give its owner your invite code (valid 5 min);
	// they call `workspaces.members.add(workspaceId, code, "maintain")`
	console.log(
		"share this code with an owner:",
		await api.workspaces.members.inviteCode(),
	);

	const workspace = await api.workspaces.get(workspaceId);
	for (const m of workspace.members) console.log(m.name, m.group);
	await api.workspaces.apps.remove(workspaceId, appId);
} finally {
	await api.workspaces.delete(workspaceId);
}
