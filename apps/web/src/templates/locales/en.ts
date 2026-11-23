/**
 * Board templates in English. Mirrors locales/es.ts (the source): same ids,
 * columns, WIP limits, labels and example cards, translated.
 */
import type { BoardTemplate } from '../model';

/** User story: role, need, benefit, then details and Gherkin acceptance criteria. */
export const USER_STORY_TEMPLATE = `**As a** [role]
**I need** [feature]
**So that** [benefit]

### Details and Assumptions
* [document what you know]

### Acceptance Criteria
\`\`\`gherkin
Given [some context]
When [certain action is taken]
Then [the outcome of the action is observed]
\`\`\``;

const story = (s: {
  role: string;
  need: string;
  benefit: string;
  details: string[];
  gherkin: string[];
}) => `**As a** ${s.role}
**I need** ${s.need}
**So that** ${s.benefit}

### Details and Assumptions
${s.details.map((d) => `* ${d}`).join('\n')}

### Acceptance Criteria
\`\`\`gherkin
${s.gherkin.join('\n')}
\`\`\``;

/** Network change request (RFC): scope, impact, step-by-step plan (MOP), rollback and checks. */
export const NETWORK_CHANGE_TEMPLATE = `**Change type:** Standard / Normal / Emergency
**Affected devices:** [hostname, IP, site]
**Impact:** [affected services, users, VLANs or links]

### Implementation plan (MOP)
1. Back up the current configuration
2. [step or command]

### Rollback plan
1. [how to return to the previous state]

### Verification
- [ ] ping / traceroute to [destination]
- [ ] show ip route / show interfaces [interface]
- [ ] Monitoring with no alarms for 30 min

### Maintenance window
[date, time and duration]`;

const networkChange = (c: {
  kind: string;
  devices: string;
  impact: string;
  steps: string[];
  rollback: string[];
  checks: string[];
}) => `**Change type:** ${c.kind}
**Affected devices:** ${c.devices}
**Impact:** ${c.impact}

### Implementation plan (MOP)
1. Back up the current configuration
${c.steps.map((s, i) => `${i + 2}. ${s}`).join('\n')}

### Rollback plan
${c.rollback.map((s, i) => `${i + 1}. ${s}`).join('\n')}

### Verification
${c.checks.map((s) => `- [ ] ${s}`).join('\n')}

### Maintenance window
To be scheduled`;

/** IT support ticket, shaped like a service desk request form. */
export const IT_TICKET_TEMPLATE = `**Request type:** Incident / Service request / Access / Change
**Requester:** [name, department and contact]
**Affected device or service:** [hostname, asset or application]
**Impact:** High (a whole department or a critical service) / Medium / Low (one person)
**Urgency:** High (cannot work) / Medium / Low

### Description
[what happens, since when, and the exact error message]

### Already tried
* [restart, another computer, another network…]

### Resolution
[cause and fix applied, for the knowledge base]`;

const itTicket = (t: {
  kind: string;
  requester: string;
  affected: string;
  impact: string;
  urgency: string;
  description: string;
  tried: string[];
}) => `**Request type:** ${t.kind}
**Requester:** ${t.requester}
**Affected device or service:** ${t.affected}
**Impact:** ${t.impact}
**Urgency:** ${t.urgency}

### Description
${t.description}

### Already tried
${t.tried.map((s) => `* ${s}`).join('\n')}

### Resolution
Pending`;

/** Content brief: one card per piece of content, from the idea to the results. */
export const CONTENT_BRIEF_TEMPLATE = `**Platform and format:** [long video, short, reel, podcast, post, newsletter…]
**Who it is for:** [your audience and what they look for]
**Hook:** [the first sentence or the first 3 seconds]

### Script or key points
1. [main idea]
2. [example or story]

### Call to action
[subscribe, comment, link in bio…]

### Before publishing
- [ ] Title and thumbnail
- [ ] Description, hashtags and links
- [ ] Subtitles
- [ ] Music and images you have the rights to use

### Results (after 7 days)
Views: · Retention: · Comments:`;

const contentBrief = (c: {
  format: string;
  audience: string;
  hook: string;
  points: string[];
  cta: string;
}) => `**Platform and format:** ${c.format}
**Who it is for:** ${c.audience}
**Hook:** ${c.hook}

### Script or key points
${c.points.map((p, i) => `${i + 1}. ${p}`).join('\n')}

### Call to action
${c.cta}

### Before publishing
- [ ] Title and thumbnail
- [ ] Description, hashtags and links
- [ ] Subtitles
- [ ] Music and images you have the rights to use

### Results (after 7 days)
Views: · Retention: · Comments:`;

const GITHUB_BOARD = {
  columns: [
    'New issues',
    'Icebox',
    'Product Backlog',
    'Sprint Backlog',
    'In progress',
    'In review',
    'Done',
  ],
  columnDescriptions: [
    'Just arrived, not refined yet',
    'Ready for someone to pick up',
    'Not started yet',
    'Committed for this sprint',
    'Actively being worked on',
    'Waiting for review',
    'Completed',
  ],
  wipLimits: [null, null, 5, null, 3, 5, null],
};

export const TEMPLATES_EN: readonly BoardTemplate[] = [
  {
    id: 'scrum',
    profile: 'technical',
    name: 'Scrum',
    description:
      'User stories with Gherkin criteria, story points and WIP limits. Lean flow: stop starting, start finishing.',
    ...GITHUB_BOARD,
    labels: [
      { name: 'enhancement', color: 'blue' },
      { name: 'bug', color: 'red' },
      { name: 'technical debt', color: 'orange' },
    ],
    cardTemplate: USER_STORY_TEMPLATE,
    cards: [
      {
        column: 0,
        title: 'How to use this board',
        patch: {
          description: `Flow: an idea enters **New Issues**. It gets refined (story + criteria + story points) and moves to the **Product Backlog**, sorted by value. What is not a priority waits in the **Icebox**.

At planning, the team pulls into the **Sprint Backlog** what fits in the sprint.

Agile and Lean principles applied:
* Deliver value early and often: small stories (≤ 8 points; 13 = split it).
* Limit work in progress (WIP): Product Backlog 5, In progress 3, In review 5. If the column turns red, finish something before starting something new.
* Pull the work, do not push it.
* Remove waste: no acceptance criteria, no sprint.
* Continuous improvement: review the flow at every retrospective.`,
        },
      },
      {
        column: 1,
        title: 'Rate products with a "like"',
        labels: ['enhancement'],
        patch: {
          description: story({
            role: 'system user',
            need: 'to mark a product with a "like"',
            benefit: 'I can express my preference',
            details: ['The user must be signed in', 'Only one "like" per product'],
            gherkin: [
              'Given I am a signed-in user',
              'And there is a product in the catalog',
              'When I mark the product with a "like"',
              'Then the system records my preference',
            ],
          }),
        },
      },
      {
        column: 2,
        title: 'Filter products',
        labels: ['enhancement'],
        patch: {
          type: 'feature',
          priority: 'medium',
          storyPoints: 5,
          description: story({
            role: 'system user',
            need: 'to query a subset of products',
            benefit: 'I find products that match specific criteria',
            details: ['Filters by category, price or popularity', 'Paginated results'],
            gherkin: [
              'Given there are products in the catalog',
              'When I apply search filters',
              'Then the system returns only the products that match the criteria',
            ],
          }),
        },
      },
      {
        column: 3,
        title: 'List products',
        labels: ['enhancement'],
        patch: {
          type: 'feature',
          priority: 'high',
          storyPoints: 3,
          sprint: 'Sprint 1',
          description: story({
            role: 'system user',
            need: 'to list every product in the catalog',
            benefit: 'I can explore the available options',
            details: ['The list may be paginated'],
            gherkin: [
              'Given there are products in the catalog',
              'When I request the product list',
              'Then the system shows every available product',
            ],
          }),
        },
      },
      {
        column: 4,
        title: 'Automate the deployment',
        labels: ['technical debt'],
        patch: {
          type: 'task',
          priority: 'medium',
          storyPoints: 8,
          sprint: 'Sprint 1',
          description: story({
            role: 'development team',
            need: 'to deploy to the cloud automatically',
            benefit: 'we ship changes quickly and reliably',
            details: [
              'A CI/CD pipeline will be used',
              'Deployment happens after changes are approved',
            ],
            gherkin: [
              'Given a change is made to the code',
              'When the change is approved and merged',
              'Then the system is deployed automatically',
            ],
          }),
        },
      },
      {
        column: 6,
        title: 'Definition of Done (DoD)',
        patch: {
          description: `A story is **Done** when:
* It meets all of its acceptance criteria.
* The code is reviewed (pull request approved).
* It has automated tests and they pass in CI.
* It is deployed and the Product Owner accepted it.`,
        },
      },
    ],
  },
  {
    id: 'bug-tracker',
    profile: 'technical',
    name: 'Incidents and DevOps',
    description: 'Bug and incident triage, from "New" to "Resolved".',
    columns: ['New', 'Triage', 'In progress', 'Verification', 'Resolved'],
    labels: [
      { name: 'production', color: 'red' },
      { name: 'staging', color: 'yellow' },
      { name: 'CI/CD', color: 'orange' },
    ],
    cards: [
      {
        column: 0,
        title: 'Error 500 when exporting CSV',
        labels: ['production'],
        patch: { type: 'bug', priority: 'high' },
      },
      {
        column: 1,
        title: 'Slow pipeline on e2e tests',
        labels: ['CI/CD'],
        patch: { type: 'task', priority: 'medium' },
      },
    ],
  },
  {
    id: 'network',
    profile: 'technical',
    name: 'Networks',
    description:
      'Network changes with rollback plan, approval and maintenance window. Routing, VLANs, firewall, VPN and Wi-Fi.',
    columns: [
      'Requests',
      'Design',
      'Approval (CAB)',
      'Scheduled window',
      'Implementation',
      'Verification',
      'Closed',
    ],
    columnDescriptions: [
      'Changes and incidents that just arrived',
      'Topology, addressing and plan (MOP)',
      'Waiting for the change board to approve',
      'Approved, with a maintenance date and time',
      'Being applied on the devices now',
      'Tests and monitoring after the change',
      'Verified and documented',
    ],
    wipLimits: [null, 4, null, null, 2, 3, null],
    labels: [
      { name: 'Routing', color: 'blue' },
      { name: 'Switching/VLAN', color: 'green' },
      { name: 'Firewall', color: 'red' },
      { name: 'VPN', color: 'purple' },
      { name: 'Wi-Fi', color: 'yellow' },
      { name: 'Monitoring', color: 'orange' },
    ],
    cardTemplate: NETWORK_CHANGE_TEMPLATE,
    cards: [
      {
        column: 0,
        title: 'How to use this board',
        patch: {
          description: `Network change management flow:
* **Requests**: every change or incident enters as a card. Incidents are of type *bug*.
* **Design**: fill in the template (devices, impact, MOP, rollback and tests).
* **Approval (CAB)**: no rollback plan, no approval.
* **Scheduled window**: put the window date on the card.
* **Implementation**: WIP limit 2. Few changes at once = less risk of an outage.
* **Verification**: run the tests and leave monitoring watching before closing.

Tips:
* Back up the configuration (running-config) before touching a device.
* Use the labels to know which layer each change affects.
* Story points = risk and effort of the change.`,
        },
      },
      {
        column: 0,
        title: 'Packet loss on the North site WAN link',
        labels: ['Monitoring', 'Routing'],
        patch: { type: 'bug', priority: 'high' },
      },
      {
        column: 1,
        title: 'New VLAN 30 for the guest network',
        labels: ['Switching/VLAN', 'Wi-Fi'],
        patch: {
          type: 'feature',
          priority: 'medium',
          storyPoints: 3,
          description: networkChange({
            kind: 'Normal',
            devices: 'SW-CORE-01, SW-ACC-03/04, WLC-01',
            impact: 'None for current users; a new isolated network for guests',
            steps: [
              'Create VLAN 30 (GUESTS) on the core and access switches',
              'Configure SVI 10.30.0.1/24 with DHCP relay',
              'Add the VLAN to the trunks towards the APs',
              'Create the "Guests" SSID mapped to VLAN 30 on the controller',
              'ACL: VLAN 30 only goes out to the Internet, no access to internal networks',
            ],
            rollback: ['Delete the SSID and VLAN 30', 'Restore the running-config from the backup'],
            checks: [
              'A client on "Guests" gets an IP 10.30.0.x',
              'ping 8.8.8.8 from VLAN 30: OK',
              'ping to 10.10.0.0/16 from VLAN 30: blocked',
            ],
          }),
        },
      },
      {
        column: 2,
        title: 'Open 443/TCP to the new web server in the DMZ',
        labels: ['Firewall'],
        patch: { type: 'task', priority: 'medium', storyPoints: 2 },
      },
      {
        column: 3,
        title: 'Upgrade the edge router operating system',
        labels: ['Routing'],
        patch: { type: 'task', priority: 'high', storyPoints: 5, sprint: 'Saturday window' },
      },
      {
        column: 4,
        title: 'IPsec tunnel with the South branch',
        labels: ['VPN'],
        patch: { type: 'feature', priority: 'medium', storyPoints: 5 },
      },
      {
        column: 5,
        title: 'Wi-Fi coverage on floor 2',
        labels: ['Wi-Fi', 'Monitoring'],
        patch: { type: 'task', priority: 'low', storyPoints: 2 },
      },
    ],
  },
  {
    id: 'it-support',
    profile: 'technical',
    name: 'IT help desk',
    description:
      'Support tickets with request types, priority from impact and urgency, SLAs and escalation to second level.',
    columns: [
      'New',
      'In progress',
      'Waiting for customer',
      'Escalated',
      'Pending third party',
      'Resolved',
      'Closed',
    ],
    columnDescriptions: [
      'Waiting for support: not assigned or answered yet',
      'An agent is working on it',
      'Missing information or the requester’s confirmation',
      'Moved to second level or to a specialist',
      'Depends on a vendor, a purchase or a warranty',
      'Fix applied; the user confirms',
      'Confirmed and documented',
    ],
    wipLimits: [null, 5, null, 3, null, null, null],
    labels: [
      { name: 'Incident', color: 'red' },
      { name: 'Request', color: 'blue' },
      { name: 'Access', color: 'purple' },
      { name: 'Hardware', color: 'orange' },
      { name: 'Software', color: 'green' },
      { name: 'Change', color: 'yellow' },
    ],
    cardTemplate: IT_TICKET_TEMPLATE,
    cards: [
      {
        column: 0,
        title: 'How to use this board',
        patch: {
          description: `Help desk flow:
* **New**: every ticket enters here. Pick its request type with a label, and its priority.
* **In progress**: the agent takes it (assign it to yourself). WIP limit 5 per column.
* **Waiting for customer**: a detail or a test from the requester is missing. The SLA pauses.
* **Escalated**: second level (networks, systems, applications). WIP limit 3.
* **Pending third party**: vendor, purchase or warranty.
* **Resolved**: fix applied. It moves to **Closed** when the user confirms.

Priority = impact × urgency, and it sets the SLA:
* **High**: first response in 30 min, resolution in 4 h.
* **Medium**: first response in 4 h, resolution in 1 business day.
* **Low**: first response in 1 business day, resolution in 3 business days.

Tips:
* Put the SLA due date on the ticket: it turns red when it is due.
* Card type: *bug* = incident, *task* = request, *feature* = change.
* Fill in the resolution when closing: it is the team’s knowledge base.`,
        },
      },
      {
        column: 0,
        title: 'I cannot print on the floor 3 printer',
        labels: ['Incident', 'Hardware'],
        patch: {
          type: 'bug',
          priority: 'medium',
          description: itTicket({
            kind: 'Incident',
            requester: 'Laura Gómez, Accounting, ext. 214',
            affected: 'PRN-F3-01 (HP LaserJet)',
            impact: 'Medium (the whole floor 3)',
            urgency: 'Medium',
            description:
              'Since this morning jobs stay in the queue with the error "Printer offline".',
            tried: ['Turn the printer off and on', 'Print from another computer: same error'],
          }),
        },
        dueInDays: 1,
      },
      {
        column: 0,
        title: 'User account for the new Sales hire',
        labels: ['Access'],
        patch: { type: 'task', priority: 'medium' },
        dueInDays: 2,
      },
      {
        column: 1,
        title: 'Outlook does not sync email',
        labels: ['Incident', 'Software'],
        patch: { type: 'bug', priority: 'high' },
        dueInDays: 0,
      },
      {
        column: 2,
        title: 'Install a PDF editor on the Management laptop',
        labels: ['Request', 'Software'],
        patch: {
          type: 'task',
          priority: 'low',
          description: 'Waiting for the department head to approve the license.',
        },
      },
      {
        column: 3,
        title: 'The VPN disconnects every 10 minutes',
        labels: ['Incident'],
        patch: { type: 'bug', priority: 'high', description: 'Escalated to the network team.' },
        dueInDays: 0,
      },
      {
        column: 4,
        title: 'Laptop with a broken screen: warranty repair',
        labels: ['Hardware'],
        patch: { type: 'task', priority: 'medium' },
      },
      {
        column: 5,
        title: 'Reset the email password',
        labels: ['Access'],
        patch: { type: 'task', priority: 'low' },
      },
      {
        column: 6,
        title: 'Update the antivirus on the Reception computers',
        labels: ['Change', 'Software'],
        patch: { type: 'feature', priority: 'low' },
      },
    ],
  },
  {
    id: 'personal',
    profile: 'simple',
    name: 'My tasks',
    description: 'The essentials to organize your day.',
    columns: ['To do', 'Doing', 'Done'],
    labels: [
      { name: 'Home', color: 'green' },
      { name: 'Work', color: 'blue' },
      { name: 'Urgent', color: 'red' },
    ],
    cards: [
      { column: 0, title: 'Drag this card to "Doing"', labels: ['Home'] },
      { column: 0, title: 'Click a card to add notes or a date', labels: ['Work'] },
      { column: 2, title: 'Create my first board', labels: [] },
    ],
  },
  {
    id: 'team-project',
    profile: 'simple',
    name: 'Team project',
    description: 'Ideas, tasks and deliveries for marketing, sales or events.',
    columns: ['Ideas', 'To do', 'Underway', 'In review', 'Ready'],
    labels: [
      { name: 'Marketing', color: 'purple' },
      { name: 'Sales', color: 'green' },
      { name: 'Design', color: 'yellow' },
    ],
    cards: [
      { column: 0, title: 'Launch campaign', labels: ['Marketing'] },
      { column: 1, title: 'Prepare a presentation for clients', labels: ['Sales'] },
      { column: 2, title: 'New logo', labels: ['Design'] },
    ],
  },
  {
    id: 'study',
    profile: 'simple',
    name: 'Studies',
    description: 'Subjects, assignments and exams under control.',
    columns: ['Pending', 'Studying', 'Review', 'Passed'],
    labels: [
      { name: 'Exam', color: 'red' },
      { name: 'Assignment', color: 'blue' },
    ],
    cards: [
      { column: 0, title: 'History final paper', labels: ['Assignment'] },
      { column: 1, title: 'Math unit 3', labels: ['Exam'] },
    ],
  },
  {
    id: 'content',
    profile: 'simple',
    everyone: true,
    lockedProfile: true,
    name: 'Content creators',
    description:
      'From the idea to the published post: script, recording, editing and publish date for each platform.',
    columns: ['Ideas', 'Script', 'Recording', 'Editing', 'Scheduled', 'Published'],
    columnDescriptions: [
      'Anything that comes to mind, no filter',
      'Hook, structure and call to action',
      'Ready to record or being recorded',
      'Editing, subtitles and thumbnail',
      'With a publish date and time',
      'It is live: check the results',
    ],
    wipLimits: [null, null, null, 2, null, null],
    labels: [
      { name: 'YouTube', color: 'red' },
      { name: 'TikTok', color: 'purple' },
      { name: 'Instagram', color: 'orange' },
      { name: 'Podcast', color: 'green' },
      { name: 'Blog / Newsletter', color: 'blue' },
      { name: 'Collaboration', color: 'yellow' },
    ],
    cardTemplate: CONTENT_BRIEF_TEMPLATE,
    cards: [
      {
        column: 0,
        title: 'How to use this board',
        patch: {
          description: `One card per piece of content, from the idea to publishing:
* **Ideas**: write everything down, no filter. Labels say which platform it is for.
* **Script**: fill in the brief (hook, key points and call to action).
* **Recording** and **Editing**: in Editing, at most 2 at a time.
* **Scheduled**: set the publish date as the card’s due date.
* **Published**: after 7 days, write the results in the brief.

Tips:
* Attach the script, the clips or the thumbnail as links (Drive, OneDrive…).
* From Connections you can add the publish date to your calendar.
* Same content for several platforms: one card with several labels.`,
        },
      },
      { column: 0, title: '10 mistakes I made when starting out', labels: ['YouTube'] },
      {
        column: 0,
        title: 'Behind the scenes of my workspace',
        labels: ['Instagram', 'TikTok'],
      },
      {
        column: 1,
        title: 'Episode 12: interview about productivity',
        labels: ['Podcast', 'Collaboration'],
        patch: {
          description: contentBrief({
            format: 'Podcast, 40 min episode (and 3 short clips)',
            audience: 'People who work remotely and get distracted easily',
            hook: '"I work 4 hours a day and get more done than before. Here is how."',
            points: [
              'Introducing the guest',
              'Her morning routine',
              'The 3 tools she uses',
              'Quick final question',
            ],
            cta: 'Subscribe and tell us your trick in the comments',
          }),
        },
        dueInDays: 9,
      },
      {
        column: 2,
        title: 'Tutorial: editing videos on your phone',
        labels: ['TikTok'],
        dueInDays: 6,
      },
      {
        column: 3,
        title: 'Headphones review (brand collaboration)',
        labels: ['YouTube', 'Collaboration'],
        dueInDays: 4,
      },
      { column: 4, title: 'Monthly newsletter', labels: ['Blog / Newsletter'], dueInDays: 2 },
      { column: 5, title: 'Reel: my morning routine', labels: ['Instagram'] },
    ],
  },
  {
    id: 'blank',
    profile: 'simple',
    everyone: true,
    name: 'Blank',
    description: 'Three empty columns. You decide the rest.',
    columns: ['To do', 'Doing', 'Done'],
    labels: [],
    cards: [],
  },
];
