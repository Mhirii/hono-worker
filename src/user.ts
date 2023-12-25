import { PostgrestError, SupabaseClient, createClient } from "@supabase/supabase-js";
import { env } from "hono/adapter";

import { Hono } from "hono";
import { createBoard } from "./boards";
import { createTask } from "./tasks";
import userDto from "./types/userDto";
import { workspaceDto } from "./types/workspaceDto";
import { createWorkspace } from "./workspaces";

const app = new Hono();

app.post("/", async (c) => {
	const { SUPABASE_URL } = env<{ SUPABASE_URL: string }>(c);
	const { SUPABASE_KEY } = env<{ SUPABASE_KEY: string }>(c);
	const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
});

app.get("/", async (c) => {
	const { SUPABASE_URL } = env<{ SUPABASE_URL: string }>(c);
	const { SUPABASE_KEY } = env<{ SUPABASE_KEY: string }>(c);
	const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
	const body = await c.req.json();
	const {
		data: { user },
	} = await supabase.auth.getUser(body.access_token);

	return new Response(JSON.stringify(user), {
		headers: {
			"Content-Type": "application/json",
			"Access-Control-Allow-Origin": "*",
		},
	});
});

export const createUser = async (
	supabase: SupabaseClient,
	uuid: string,
	email: string,
): Promise<{ user: userDto | undefined, error: PostgrestError | undefined | unknown }> => {
	const { data, error } = await supabase
		.from("users")
		.insert({
			uuid: uuid,
			email: email
		})
		.select()
	if (error) {
		return {
			user: undefined,
			error
		}
	}
	const user: userDto = data[0]

	const { workspace: workspaceData, error: workspaceError } = await createWorkspace(supabase, "Inbox", user.id, false)
	if (workspaceError) {
		console.log(workspaceError)
		return {
			user: undefined,
			error: workspaceError
		}
	}
	if (workspaceData) {
		const workspace: workspaceDto = workspaceData
		const { data: updatedUserData, error: updateUserError } = await supabase
			.from("users")
			.update({
				inbox: workspace.id
			})
			.eq("id", user.id)
			.select()
		if (updateUserError) {
			console.log("error")
			console.log(updateUserError)
			return {
				user: undefined,
				error: updateUserError
			}
		}

		const { board: planningBoard, error: planningError } = await createBoard(supabase, "Planning", workspace.id)
		const { board: progressBoard, error: progressError } = await createBoard(supabase, "In Progress", workspace.id)
		const { board: doneBoard, error: doneError } = await createBoard(supabase, "Done", workspace.id)
		for (const error of [planningError, progressError, doneError]) {
			if (error) {
				return {
					user: undefined,
					error
				}
			}
		}
		if (planningBoard && progressBoard && doneBoard) {
			const { task: task1, board: updatedPlanningBoard, error: taskError1 } = await createTask(supabase, "Plan Tasks", planningBoard.id)
			const { task: task3, board: updatedProgressBoard, error: taskError2 } = await createTask(supabase, "Work on Projects", progressBoard.id)
			const { task: task5, board: updatedDoneBoard, error: taskError3 } = await createTask(supabase, "Get Things Done", doneBoard.id)
			for (const error of [taskError1, taskError2, taskError3]) {
				if (error) {
					return {
						user: undefined,
						error
					}
				}
			}
		}
		return {
			user,
			error: undefined
		}
	}
	console.log("Something went wrong")
	return {
		user: undefined,
		error: Error("Something went wrong :(")
	}
}

export default app;
