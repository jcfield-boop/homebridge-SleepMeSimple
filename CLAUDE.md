# CLAUDE.md - Development Guidelines

## Build Commands
- `npm run build` - Compile TypeScript code
- `npm run watch` - Watch and recompile on changes
- `npm run lint` - Run ESLint checks
- `npm run clean` - Remove dist directory
- `npm run prepublishOnly` - Clean and build before publishing

## Code Style Guidelines
- **TypeScript**: Target ES2022, strict type checking enabled
- **Imports**: Use ES modules with relative paths including .js extension
- **Types**: Define explicit types for parameters/returns, avoid `any`
- **Naming**: camelCase for variables/functions, PascalCase for classes/interfaces
- **Error Handling**: Use try/catch with appropriate logging, implement retries
- **Formatting**: 2-space indentation, JSDoc comments for public methods
- **API Design**: Queue-based request handling with priority levels

## Project-Specific Guidelines
- **Logging**: Use appropriate levels (error/warn/info/debug/verbose) with context
- **API Communication**: Respect rate limits, use caching, implement retries
- **Homebridge Integration**: Follow plugin conventions for consistent device state