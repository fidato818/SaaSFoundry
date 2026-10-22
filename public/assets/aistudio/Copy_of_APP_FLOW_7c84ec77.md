Create comprehensive Application Flow documentation (APP_FLOW.md) for [YOUR APP NAME].

Context:
[Provide brief description of app]

Generate documentation with these sections:

1. ENTRY POINTS
List all ways users can enter the app:
- Direct URL access
- Deep links (email, notifications)
- OAuth/social login
- Search engines
- Marketing campaigns

2. CORE USER FLOWS
For each major user task, create a detailed flow:

Required Flows:
- User onboarding/registration
- Main feature usage (e.g., create post, make purchase, book appointment)
- Account management
- Error recovery

For EACH flow, document:

**HAPPY PATH** (Step-by-step):
- Page/Screen name
- UI elements present
- User actions (clicks, inputs)
- System responses
- Validation rules
- Next page/state
- Success criteria

**ERROR STATES** (What can go wrong):
- Invalid inputs (how they're handled)
- System errors (display and recovery)
- Timeout scenarios
- Offline behavior

**EDGE CASES**:
- User abandons flow
- User goes back
- Concurrent actions
- Session expiry

3. NAVIGATION MAP
Create a hierarchical tree showing:
- Main navigation structure
- Sub-pages and nesting
- Cross-links between sections
- Authentication requirements per page

4. SCREEN INVENTORY
For each unique screen/page, specify:
- URL/Route
- Access level (public/authenticated/admin)
- Purpose
- Key UI elements
- Available actions → where they lead
- State variants (loading, empty, error, success)

5. DECISION POINTS
Document every conditional in the flow using IF-THEN logic: