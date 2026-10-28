// what an agent may change on a record a human may have decided already:
// source facts always, the classification only while the human has not confirmed it,
// unless the human asked the agent to change it (override)
export function agentUpdate<T extends Record<string, unknown>>(
    current: { status: string } | null,
    facts: T,
    classification: Record<string, unknown>,
    override = false,
): T & Record<string, unknown> {
    if (current?.status === 'confirmed' && !override) return facts;
    return {...facts, ...Object.fromEntries(Object.entries(classification).filter(([, value]) => value !== undefined))};
}
