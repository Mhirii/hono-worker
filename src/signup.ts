import { createClient } from "@supabase/supabase-js";
import { env } from "hono/adapter";
import { AuthDto } from "./types/authDto";

import { Hono } from "hono";

const app = new Hono();

app.post("/", async (c) => {
	const { SUPABASE_URL } = env<{ SUPABASE_URL: string }>(c);
	const { SUPABASE_KEY } = env<{ SUPABASE_KEY: string }>(c);
	const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

	const body: AuthDto = await c.req.json();

	const { data, error } = await supabase.auth.signUp({
		email: body.email,
		password: body.password,
	});

	if (error)
		return new Response(JSON.stringify(error), {
			headers: {
				"Content-Type": "application/json",
			},
		});

	if (data.user) {
		const { data: workspace_data, error: workspace_error } = await supabase
			.from("workspaces")
			.insert({
				created_at: new Date(),
				title: "inbox",
				owned_by: data.user.id,
				isSharable: false,
			})
			.select();
		if (workspace_error) {
			console.log(workspace_error);
		}

		if (workspace_data) {
			const workspace_id = workspace_data[0].id;
			const { data: boards_response, error: boards_error } = await supabase
				.from("boards")
				.insert([
					{
						created_at: new Date(),
						title: "Planning",
						workspace: workspace_id,
					},
					{
						created_at: new Date(),
						title: "Progress",
						workspace: workspace_id,
					},
					{
						created_at: new Date(),
						title: "Done",
						workspace: workspace_id,
					},
				])
				.select();
			if (boards_error) {
				console.log(boards_error);
			}
		}
	}

	return new Response(JSON.stringify(data), {
		headers: {
			"Content-Type": "application/json",
			"Access-Control-Allow-Origin": "*",
		},
	});
});

export default app;
