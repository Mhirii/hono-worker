import { Hono } from "hono";
import { workspaceDto } from "./types/workspaceDto";
import { getSupabaseClient, handle_error, headers } from "./utils";

const app = new Hono();

/* ──────────────────────── creates a new workspace ──────────────────────── */
app.post("/", async (c) => {
	const supabase = getSupabaseClient(c);
	const body = await c.req.json();
	const new_workspace: workspaceDto = {
		title: body.title,
		owned_by: body.id,
		isSharable: true,
	};

	const { data, error } = await supabase
		.from("workspaces")
		.insert(new_workspace)
		.select();

	if (error) {
		return handle_error(error);
	}
	return new Response(JSON.stringify(data), {
		headers: headers,
	});
});

/* ───────────── Retrieves workspaces owned by a specific user ───────────── */
app.get("/user/:id", async (c) => {
	const supabase = getSupabaseClient(c);

	const user_id = c.req.param("id");
	const { data, error } = await supabase
		.from("workspaces")
		.select()
		.eq("owned_by", user_id);

	if (error) {
		return handle_error(error);
	}
	return new Response(JSON.stringify(data), {
		headers: headers,
	});
});

/* ────────────────── Retrieves a workspace by id ───────────────── */
app.get("/:id", async (c) => {
	const supabase = getSupabaseClient(c);

	const { data, error } = await supabase
		.from("workspaces")
		.select()
		.eq("id", c.req.param("id"));

	if (error) {
		return handle_error(error);
	}
	return new Response(JSON.stringify(data), {
		headers: headers,
	});
});

/* ──────── Retrieves boards associated with the specified workspace ─────── */
app.get("/boards/:workspace_id", async (c) => {
	const supabase = getSupabaseClient(c);

	const { data, error } = await supabase
		.from("boards")
		.select()
		.eq("workspace", c.req.param("workspace_id"));

	if (error) {
		return handle_error(error);
	}
	return new Response(JSON.stringify(data), {
		headers: headers,
	});
});

// TODO: Retrieve shared workspaces

/* ─────────────────────────── Deletes a workspace ────────────────────────── */
app.delete("/:id", async (c) => {
	const supabase = getSupabaseClient(c);

	const { data, error } = await supabase
		.from("workspaces")
		.delete()
		.eq("id", c.req.param("id"))
		.select();

	if (error) {
		return handle_error(error);
	}
	return new Response(JSON.stringify(data), {
		headers: headers,
	});
});

export default app;
