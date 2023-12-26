import { PostgrestError } from "@supabase/supabase-js"

export interface isAuthorizedDto {
  isAuthorized: boolean
  authorizationError: PostgrestError | Error | null
}