# AGENTS.md

## Build/Lint/Test Commands

- Build: `npm run build`
- Development: `npm run dev`
- Test: `npm test` or `npm test -- testNamePattern="specific test"`
- Lint/Format: `npm run prettify`

## Code Style Guidelines

- TypeScript with strict mode enabled
- Prettier formatting (semi: true, singleQuote: true, tabWidth: 2, printWidth: 120)
- Import organization: External libraries first, then local imports
- Naming: PascalCase for components/classes, camelCase for variables/functions
- Error handling: Try/catch blocks with meaningful error messages
- Types: Strict typing with TypeScript interfaces and types
- React: Functional components with hooks
- Node structure: Each node has a .tsx component and definition.ts file
- Comments: No need to write a comment for each code block. Write only for complicated and necessary code blocks.

## Testing

- Jest with ts-jest transformer
- Tests located in src/test/ directory
- Mock external dependencies

## Node Development

- Each node should extend BaseNode
- Definitions contain node metadata and input/output schemas
- Use Zod for schema validation
- Follow existing node patterns in src/components/nodes/
