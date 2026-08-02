## Startup Discovery Pipeline Guidelines

1. **Scraping Target Selection (No Paid Tools Policy)**:
   - NEVER use or recommend paid tools, APIs, or premium subscriptions for web scraping.
   - When adding new data sources, always prioritize targets with easily accessible RSS feeds or simple HTML structures (e.g., Inc42, Entrackr, YourStory).
   - Actively avoid heavily paywalled or aggressive bot-protected sites (e.g., ETtech, VCCircle, DealStreetAsia) as they break automated pipelines.

2. **Upstream Integration Architecture**:
   - When integrating new scrapers or data sources, do NOT create parallel or disjointed pipelines.
   - Always merge new data sources directly into the main discovery flow (`pipeline.py`) *upstream* of downstream processing.
   - Ensure that all newly discovered startups (regardless of their origin source) are appended to the main batch so they automatically inherit database deduplication, LLM verification, LinkedIn Lead Generation, Google Sheets synchronization, and reporting.

3. **Batched LLM Operations**:
   - For high-volume processing loops (e.g. lead generation, classification), always bundle items into batches (default: 5) to leverage batched LLM endpoints (`find_leads_batch`). This reduces API call overhead and saves token cost.

4. **Self-Healing Completion Checks**:
   - Never mark a database entity as "processed" using a generic boolean flag if downstream operations can fail (e.g. due to network issues or SSL interception).
   - Instead, verify completion by checking the existence of actual output records (e.g. matching rows in `LeadProfile`). This allows the script to automatically resume and retry failed items on subsequent runs.

5. **Grounding & Research Caching**:
   - Any service performing web searches or search-grounded LLM analysis (e.g., internship research, funding verification) must implement a database cache (`ResearchCache`) checked prior to making external calls.
   - Cache entries should expire after 7 days to ensure data freshness while preventing redundant API consumption.

6. **Multi-Tier Provider Architecture**:
   - Primary LLM operations must use Groq (`llama-3.3-70b-versatile`) to leverage its 14,400 RPD free capacity.
   - Gemini APIs are reserved exclusively for embeddings (`gemini-embedding-001`) and Google Search Grounding.
   - If web search or grounding fails/times out, services must fall back to local database or LLM internal knowledge base rather than failing or skipping records.

7. **Decoupled Heavy Maintenance**:
   - Never execute long-running tasks (such as full vector re-indexing or batch scraping) synchronously inside user-facing request paths (like Telegram commands or web API endpoints).
   - Always provide a fast local fallback (e.g. SQLite keyword search) for interactive queries.

8. **Strict Timeout & Memory Guardrails**:
   - Interactive LLM endpoints must enforce adequate HTTP timeouts (minimum 30–45s).
   - Heavy batch jobs running on low-RAM cloud instances must explicitly slice datasets into small chunks (25–30 items) with explicit garbage collection (`gc.collect()`).


# AWS Guidance

- Prefer the AWS MCP Server for AWS interactions — it provides sandboxed
  execution, observability, and audit logging. If unavailable, use the
  AWS CLI directly.
- Before starting a task, check whether a relevant AWS skill is available.
  Load the skill with `retrieve_skill` and prefer its guidance over
  general knowledge.
- When uncertain about specific AWS details (API parameters, permissions,
  limits, error codes), verify against documentation rather than guessing.
  State uncertainty explicitly if you cannot confirm.
- When creating infrastructure, prefer infrastructure-as-code (AWS CDK or
  CloudFormation) over direct CLI commands.
- When working with infrastructure, follow AWS Well-Architected Framework
  principles.
- Do not use em dashes in AWS resource names or descriptions. Use
  hyphens instead.

## Secret Safety

- MUST load the `aws-secrets-manager` skill first for any secret,
  credential, API key, token, or password task. MUST NOT call
  `secretsmanager get-secret-value` or `batch-get-secret-value`, and MUST
  NOT hit the Secrets Manager Agent daemon directly. MUST use
  `{{resolve:secretsmanager:secret-id:SecretString:json-key}}` with
  `asm-exec` so the secret resolves at runtime without entering context.
