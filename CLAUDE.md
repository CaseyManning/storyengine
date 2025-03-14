# StoryEngine Development Guidelines

## Build Commands
- Client: `cd client && npm start` - Start development server
- Client: `cd client && npm run build` - Create production build
- Client: `cd client && npm test` - Run tests (interactive)
- Client: `cd client && npm test -- --testPathPattern=<path>` - Run specific test

## Code Style
- Use TypeScript with strict mode enabled
- Ensure proper typing for all variables, parameters, and return values
- Follow React hooks best practices (dependencies array, custom hooks)
- Use functional components with React hooks over class components
- Document components and functions with JSDoc comments
- Organize imports: React first, then libraries, then local modules
- Use consistent naming:
  - Components: PascalCase
  - Functions/variables: camelCase
  - Constants: UPPER_SNAKE_CASE
  - Files: kebab-case
- Error handling: Use try/catch blocks and provide meaningful error messages
- State management: Use Redux Toolkit for global state and React hooks for local state

## Project Structure
- React TypeScript frontend (client/)
- Node.js + Express backend (server/) with MongoDB and OpenAI integration
- Visual novel style UI with character portraits and dialogue windows