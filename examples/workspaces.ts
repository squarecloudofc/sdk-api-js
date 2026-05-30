import { SquareCloudAPI } from "@squarecloud/api";

const api = new SquareCloudAPI(process.env.SQUARE_API_KEY as string);

// ─── Create a workspace ────────────────────────────────────────────────────
// Available on Standard, Pro, and Enterprise plans.
const { id: workspaceId } = await api.workspaces.create({ name: "Acme" });

// ─── List workspaces you own or belong to ──────────────────────────────────
const workspaces = await api.workspaces.list();

for (const ws of workspaces) {
  console.log(
    `${ws.name} (${ws.memberList.length} members, ${ws.applicationList.length} apps)`,
  );
}

// ─── Fetch a single workspace ──────────────────────────────────────────────
const workspace = await api.workspaces.fetch(workspaceId);
console.log(workspace.memberList);
console.log(workspace.applicationList);

// ─── Invite a member ───────────────────────────────────────────────────────
// 1. The user being invited generates a short-lived code (their own client):
//    const code = await otherApi.workspaces.generateInviteCode();
// 2. The workspace owner consumes it:
await workspace.members.add("abcdef0123456789abcdef0123456789", "maintain");

// Roles: "view" | "manager" | "maintain" | "admin"
// "owner" cannot be assigned — ownership transfer is not exposed.

// ─── Change a member's role ────────────────────────────────────────────────
await workspace.members.update("1234567890", "admin");

// ─── Remove a member ───────────────────────────────────────────────────────
// Owner only.
await workspace.members.remove("1234567890");

// ─── Share / unshare applications ──────────────────────────────────────────
await workspace.applications.add("abc123def456abc123def456");
await workspace.applications.remove("abc123def456abc123def456");

// ─── Leave (as a member) or delete (as the owner) ──────────────────────────
await workspace.leave();
await workspace.delete();
