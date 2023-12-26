import { AuthDto } from "./types/authDto";

import { Hono } from "hono";
import { createUser } from "./user";
import { getSupabaseClient, headers } from "./utils";

const app = new Hono();


app.post("/", async (c) => {
  const supabase = getSupabaseClient(c);
  const body: AuthDto = await c.req.json();

  const { data, error } = await supabase.auth.signUp({
    email: body.email,
    password: body.password,
  });

  if (error)
    return new Response(JSON.stringify(error), {
      headers: headers,
    });

  if (data.user?.id && data.user.email) {
    const user = {
      id: data.user.id,
      email: data.user.email,
    };
    const { user: userData, error: userError } = await createUser(supabase, user.id, user.email)
    if (userError) {
      console.log(userError)
      return new Response(JSON.stringify(userError), {
        headers: headers,
      });
    }
    return new Response(JSON.stringify({ data: data, userData: userData }), {
      headers: headers,
    });
  }
});


export default app;
