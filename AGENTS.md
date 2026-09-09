# Project documentation

- Maintain English and Simplified Chinese documentation together. Within each package,
  use `docs/en-us/<name>.md` and `docs/zh-cn/<name>.md` with matching filenames.
- When adding or changing English documentation, finish the English source first, then
  delegate the corresponding Chinese translation/update to a lightweight sub-agent
  (`gpt-5.6-luna` when available). The parent agent must review terminology, technical
  meaning, code blocks and links before completing the task. Translation is an authorized
  bounded subtask; this rule does not request delegation for unrelated work.
- Preserve API paths, identifiers, enum values, commands and code examples in translation.
  Use same-language documentation links where available and add a link to the other language.
- API references are concise contract indexes for humans and coding agents. Document
  authentication boundaries, response wrapping, defaults and business rules; link to
  controllers, DTOs and tests rather than duplicating every schema and example.
- Keep Spring backend and Next.js proxy contracts separate. When an API changes, update
  affected references in both languages. Check endpoint coverage, JSON examples and local
  links. Do not document proposed functionality as implemented.