import {
	PostgrestError,
	SupabaseClient,
	createClient,
} from "@supabase/supabase-js";
import { Context } from "hono";
import { env } from "hono/adapter";
import { isAuthorizedDto } from "./types/authorization";
import { getWorkspaceById } from "./workspaces";

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

/**
 * Checks if a user is authorized to access a workspace.
 *
 * @param {SupabaseClient} supabase - The Supabase client used for database operations.
 * @param {number} user_id - The ID of the user.
 * @param {number} workspace_id - The ID of the workspace.
 * @return {Promise<isAuthorizedDto>} {isAuthorized: boolean, authorizationError: Error}
 */
export const workspaceAuthorization = async (supabase: SupabaseClient, user_id: number, workspace_id: number): Promise<isAuthorizedDto> => {
	const { workspace, error } = await getWorkspaceById(supabase, workspace_id)
	if (error) {
		return { isAuthorized: false, authorizationError: new Error(`Error occurred while trying to find workspace with id ${workspace_id}`) }
	}
	if (!workspace) {
		return { isAuthorized: false, authorizationError: new Error(`could not find workspace with id ${workspace_id}`) }
	}
	if (workspace.owned_by === user_id) {
		return { isAuthorized: true, authorizationError: null }
	}
	if (workspace.isSharable && workspace.collaborators && workspace.collaborators.includes(user_id)) {
		return { isAuthorized: true, authorizationError: null }
	}
	return { isAuthorized: false, authorizationError: new Error("Not Authorized") }
}
