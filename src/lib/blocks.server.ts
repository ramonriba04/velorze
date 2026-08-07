/** Users involved in a block with me, in either direction. Server-only helper. */
export async function blockedIds(ctx: { supabase: any; userId: string }): Promise<Set<string>> {
  const { data } = await ctx.supabase.rpc("blocked_with_me", { _user_id: ctx.userId });
  const ids = ((data as any[]) ?? [])
    .map((row: any) => (typeof row === "string" ? row : row?.blocked_with_me))
    .filter(Boolean);
  return new Set<string>(ids);
}
