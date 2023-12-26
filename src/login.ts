import { createClient } from "@supabase/supabase-js";
import { Hono } from "hono";
import { env } from "hono/adapter";
import { AuthDto } from "./types/authDto";
import { getUserById, getUserByUUID, getUserInfo } from "./user";
import { headers } from "./utils";

const app = new Hono();

app.post("/", async (c) => {
	const { SUPABASE_URL } = env<{ SUPABASE_URL: string }>(c);
	const { SUPABASE_KEY } = env<{ SUPABASE_KEY: string }>(c);
	const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

	const body: AuthDto = await c.req.json();

	const { data, error } = await supabase.auth.signInWithPassword({
		email: body.email,
		password: body.password,
	});

	if (error) {
		return new Response(JSON.stringify(error), {
			headers: headers,
		});
	}

	const { user: userData, error: userError } = await getUserByUUID(supabase, data.user.id)
	if (userError) {
		return new Response(JSON.stringify(userError), {
			headers: headers,
		});
	}
	if (!userData) {
		return new Response(JSON.stringify("User not found"), {
			headers: headers,
		});
	}

	return new Response(JSON.stringify({ data: data, userData: userData }), {
		headers: headers,
	});
});

export default app;
