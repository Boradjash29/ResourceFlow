/**
 * Structured Context Injection (Phase 2A)
 */
import { ragConfig } from './config.js';
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
 * FIX: Bug 5 - Replacing hardcoded 4096 limit with dynamic calculation from ragConfig
 */
export const getTokenBudget = () => {
  const total = ragConfig.maxContextWindow || 128000;
  return {
    system_prompt: 1000,
    user_message: 1000,
    chat_history: Math.floor(total * 0.2),   // 20% for history
    resource_context: Math.floor(total * 0.5), // 50% for resources
    schedule_context: Math.floor(total * 0.1), // 10% for schedule
    response_buffer: 2000,
    total
  };
};

export function estimateTokens(text) {
  if (!text) return 0;
  // Improved heuristic: 1 token ~= 4 chars for plain text, but ~3 chars for 
  // structured data (Markdown/JSON/Code). We use 3.2 as a safer average.
  const baseTokens = Math.ceil(text.length / 3.2);
  // Add a 5% safety buffer for special characters and formatting
  return Math.ceil(baseTokens * 1.05);
}

export function fitContextToBudget(resources, schedule, chatHistory) {
  const budgetObj = getTokenBudget();
  let budget = budgetObj.resource_context;
  const fittedResources = [];

  for (const resource of resources) {
    const { resourceBlock } = buildResourceContext([resource]);
    const tokens = estimateTokens(resourceBlock);
    if (budget - tokens < 0) break;
    fittedResources.push(resource);
    budget -= tokens;
  }

  // FIX: Bug 3 - Add iterative trimming for the schedule array
  let scheduleBudget = budgetObj.schedule_context;
  const fittedSchedule = [];
  for (const item of schedule) {
    const { scheduleBlock } = buildResourceContext([], [item]);
    const tokens = estimateTokens(scheduleBlock);
    if (scheduleBudget - tokens < 0) break;
    fittedSchedule.push(item);
    scheduleBudget -= tokens;
  }

  const historyBudget = budgetObj.chat_history;
  let fittedHistory = [...chatHistory].reverse();
  let historyTokens = 0;
  fittedHistory = fittedHistory.filter(msg => {
    const t = estimateTokens(msg.content);
    if (historyTokens + t > historyBudget) return false;
    historyTokens += t;
    return true;
  }).reverse();

  return { fittedResources, fittedSchedule, fittedHistory };
}

/**
 * System prompts and persona definitions (Phase 3A preview)
 */
export const getSystemPrompt = (userName, role, resourceContext = '', scheduleContext = '', contextSummary = '') => {
  const firstName = typeof userName === 'string' ? userName.split(' ')[0] : 'User';

  return {
    role: "system",
    content: `You are ResourceFlow AI, an intelligent booking and facility management assistant. 
You are currently assisting the user named ${userName?.toUpperCase() || 'USER'} (Account Role: ${role.toUpperCase()}).

═══ THOUGHT PROCESS (MANDATORY) ═══
Before responding, you MUST think step-by-step:
1. QUERY: What is the user specifically asking for?
2. ENTITY: Resolve pronouns (it, that) using CONVERSATION CONTEXT.
3. CONTEXT: Examine AVAILABLE RESOURCES and USER SCHEDULE.
4. PERMISSION: Check if the user's role (${role}) is allowed to perform the requested action.
5. CONFIRMATION: If the action is DELETE or CANCEL, check if the user has already said "YES" to a pending confirmation. If not, YOU MUST ASK for confirmation first.
6. ACTION: Determine the necessary [ACTION_TAG] from the list below. If no defined action matches, respond in plain text only.
7. FORMAT: When triggering an action, use the format: [ACTION_NAME: { "key": "value" }].

═══ SUPPORTED ACTIONS (STRICT) ═══
Only use these specific tags. Do NOT invent tags like SEARCH_RESOURCES.
- [BOOK_ACTION: { "resource_id": "ID", "start_time": "ISO", "end_time": "ISO", "meeting_title": "string", "description": "string" }]
- [CANCEL_BOOK_ACTION: { "booking_id": "ID" }]
- [UPDATE_BOOKING_ACTION: { "booking_id": "ID", "start_time": "ISO", "end_time": "ISO" }]
- [ADD_RESOURCE_ACTION: { "name": "string", "type": "string", "capacity": number, "location": "string" }]
- [UPDATE_RESOURCE_ACTION: { "resource_id": "ID", "name": "string", "status": "available|unavailable" }]
- [DELETE_RESOURCE_ACTION: { "resource_id": "ID" }]

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
- Capabilities: View resources, Create bookings, Manage YOUR OWN bookings.
- Restrictions: CANNOT delete or modify the resource catalog itself.
- LISTING: When listing resources, use a numbered list with Name, Capacity, and Location.
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
