/**
 * Structured Context Injection (Phase 2A)
 */
export function buildResourceContext(resources, userBookings = []) {
  const resourceBlock = resources.length > 0 
    ? resources.map((r, i) => `
  RESOURCE ${i+1}:
    id: ${r.id}
    name: "${r.name}"
    type: ${r.type}
    capacity: ${r.capacity} people
    location: ${r.location || 'Not specified'}
    description: ${r.description || r.content || ""}
    status: ${r.status || 'AVAILABLE'}
  `).join('\n---\n')
    : 'No matching resources found in context.';

  if (resources.length > 0 && resources.some(r => !r.description && !r.content)) {
    console.warn('[RAG] Resource missing both description and content:', resources.find(r => !r.description && !r.content)?.name);
  }

  const scheduleBlock = userBookings.length > 0
    ? userBookings.map(b => `
  EXISTING BOOKING:
    booking_id: ${b.id}
    resource: "${b.resource?.name || 'Unknown'}"
    start: ${b.start_time || b.startTime}
    end: ${b.end_time || b.endTime}
    title: "${b.meeting_title || b.title}"
    status: ${b.status}
    `).join('\n')
    : 'No existing bookings found for this period.';

  return { resourceBlock, scheduleBlock };
}

/**
 * Dynamic Context Budget Management (Phase 2B)
 */
export const TOKEN_BUDGET = {
  system_prompt: 800,
  user_message: 200,
  chat_history: 600,
  resource_context: 2000,
  schedule_context: 600,
  response_buffer: 800,
  total: 5000 
};

export function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.length / 3.8); 
}

export function fitContextToBudget(resources, schedule, chatHistory) {
  let budget = TOKEN_BUDGET.resource_context;
  const fittedResources = [];

  for (const resource of resources) {
    const { resourceBlock } = buildResourceContext([resource]);
    const tokens = estimateTokens(resourceBlock);
    if (budget - tokens < 0) break;
    fittedResources.push(resource);
    budget -= tokens;
  }

  const historyBudget = TOKEN_BUDGET.chat_history;
  let fittedHistory = [...chatHistory].reverse();
  let historyTokens = 0;
  fittedHistory = fittedHistory.filter(msg => {
    const t = estimateTokens(msg.content);
    if (historyTokens + t > historyBudget) return false;
    historyTokens += t;
    return true;
  }).reverse();

  return { fittedResources, fittedHistory };
}

/**
 * System prompts and persona definitions (Phase 3A preview)
 */
export const getSystemPrompt = (userName, role, resourceContext = '', scheduleContext = '', contextSummary = '') => {
  const firstName = typeof userName === 'string' ? userName.split(' ')[0] : 'User';

  return {
    role: "system",
    content: `You are the ResourceFlow AI Assistant for ${userName?.toUpperCase() || 'USER'} (${role.toUpperCase()}).

═══ THOUGHT PROCESS (MANDATORY) ═══
Before responding, you MUST think step-by-step:
1. QUERY: What is the user specifically asking for?
2. ENTITY: Resolve pronouns (it, that) using CONVERSATION CONTEXT.
3. CONTEXT: Examine AVAILABLE RESOURCES and USER SCHEDULE.
4. PERMISSION: Check if the user's role (${role}) is allowed to perform the requested action.
5. CONFIRMATION: If the action is DELETE or CANCEL, check if the user has already said "YES" to a pending confirmation. If not, YOU MUST ASK for confirmation first.
6. ACTION: Determine the necessary [ACTION_TAG].

═══ YOUR IDENTITY ═══
You are ResourceFlow AI. You ONLY assist with resource booking, availability, and facility management.

═══ CONVERSATION CONTEXT ═══
${contextSummary || 'No prior context.'}

═══ ROLE: ${role.toUpperCase()} ═══
${role === 'admin' ? `
YOU ARE THE ADMINISTRATOR.
- Capabilities: Add/Edit/Delete resources, View all bookings, Cancel any booking.
- Restrictions: CANNOT create bookings for yourself.
` : `
YOU ARE AN EMPLOYEE.
- Capabilities: Search resources, Create bookings, Manage YOUR OWN bookings.
- Restrictions: CANNOT delete or modify the resource catalog itself.
`}

═══ STRICTURES ═══
- CONTEXT-ONLY: State ONLY facts explicitly present in CONTEXT. NEVER invent info.
- DESTRUCTIVE ACTIONS: For CANCEL_BOOK_ACTION or DELETE_RESOURCE_ACTION, if not already confirmed, ask: "Are you sure you want to [action] [resource]? Please say YES to confirm."
- ID SECURITY: NEVER display UUIDs/IDs. Use names only.
- CITE SOURCES: Internally refer to the ID for actions but show the Name to user.

═══ AVAILABLE RESOURCES ═══
${resourceContext}

═══ USER SCHEDULE ═══
${scheduleContext}
`
  };
};
