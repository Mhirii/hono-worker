import {
	PostgrestError,
	SupabaseClient,
	createClient,
} from "@supabase/supabase-js";
import { Context } from "hono";
import { env } from "hono/adapter";

export const headers = {
	"Content-Type": "application/json",
	"Access-Control-Allow-Origin": "*",
};

/**
 * Handles the error and returns a Response object.
 *
 * @param {Error} error - The error to be handled.
 * @return {Response} A Response object with the error message.
 */
export const handle_error = (error: PostgrestError): Response => {
	console.log(error);
	return new Response(JSON.stringify(error), {
		headers: headers,
	});
};

/**
 * Returns a Supabase client based on the provided context.
 *
 * @param {Context} c - The context object containing the environment variables.
 * @return {SupabaseClient} The Supabase client connected to the specified URL and key.
 */
export const getSupabaseClient = (c: Context): SupabaseClient => {
	const { SUPABASE_URL } = env<{ SUPABASE_URL: string }>(c);
	const { SUPABASE_KEY } = env<{ SUPABASE_KEY: string }>(c);
	return createClient(SUPABASE_URL, SUPABASE_KEY);
};
