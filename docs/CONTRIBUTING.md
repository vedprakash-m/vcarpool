# Contributing to Carpool

Thank you for your interest in contributing to Carpool! This document provides guidelines for contributing to our smart carpool management platform.

## Table of Contents

- [Getting Started](#getting-started)
- [Code of Conduct](#code-of-conduct)
- [How to Contribute](#how-to-contribute)
- [Development Setup](#development-setup)
- [Code Style Guidelines](#code-style-guidelines)
- [Security Guidelines](#security-guidelines)
- [Testing Requirements](#testing-requirements)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Pull Request Process](#pull-request-process)
- [License Agreement](#license-agreement)
- [Contact](#contact)

## Getting Started

Before contributing, please:

1. Read this contributing guide thoroughly
2. Review the [PROJECT_METADATA.md](PROJECT_METADATA.md) to understand the project architecture
3. Check existing [issues](https://github.com/vedprakashmishra/carpool/issues) and [pull requests](https://github.com/vedprakashmishra/carpool/pulls)
4. Set up your development environment

## Code of Conduct

We are committed to providing a welcoming and inspiring community for all. Please be respectful and professional in all interactions.

### Our Standards

- Use welcoming and inclusive language
- Be respectful of differing viewpoints and experiences
- Gracefully accept constructive criticism
- Focus on what is best for the community
- Show empathy towards other community members

## How to Contribute

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates. When you create a bug report, include:

- A clear and descriptive title
- Steps to reproduce the issue
- Expected behavior vs. actual behavior
- Screenshots or code snippets if applicable
- Your environment details (OS, Node.js version, browser, etc.)

### Suggesting Enhancements

Enhancement suggestions are welcome! Please provide:

- A clear and descriptive title
- A detailed description of the proposed feature
- Use cases and benefits
- Any implementation ideas you may have

### Your First Code Contribution

Look for issues labeled `good first issue` or `help wanted`. These are great starting points for new contributors.

## Development Setup

### Prerequisites

- Node.js 22+ and npm
- Azure CLI (for infrastructure)
- Git

### Local Setup

1. **Fork and clone the repository:**

   ```bash
   git clone https://github.com/your-username/carpool.git
   cd carpool
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Set up environment variables:**

   ```bash
   cp frontend/.env.example frontend/.env.local
   cp backend/.env.example backend/.env.local
   # Fill in your environment variables
   ```

4. **Start the development servers:**

   ```bash
   # Frontend (in one terminal)
   cd frontend
   npm run dev

   # Backend (in another terminal)
   cd backend
   npm run start
   ```

5. **Run tests:**
   ```bash
   npm test
   ```

## Code Style Guidelines

### General Principles

- Write clean, readable, and maintainable code
- Follow existing code patterns and conventions
- Use meaningful variable and function names
- Add comments for complex logic
- Keep functions small and focused

### TypeScript/JavaScript

- Use TypeScript for all new code
- Follow ESLint configuration (run `npm run lint`)
- Use Prettier for code formatting (run `npm run format`)
- Prefer `const` over `let`, avoid `var`
- Use arrow functions for callbacks
- Use async/await over Promises where possible

### React/Next.js

- Use functional components with hooks
- Follow React best practices
- Use TypeScript interfaces for props
- Implement proper error boundaries
- Use semantic HTML elements
- Ensure accessibility (WCAG 2.1 AA compliance)

### CSS/Styling

- Use Tailwind CSS classes
- Follow mobile-first responsive design
- Use CSS custom properties for theming
- Maintain consistent spacing and typography

### Backend/API

- Follow RESTful API conventions
- Use proper HTTP status codes
- Implement proper error handling
- Add input validation for all endpoints
- Use TypeScript interfaces for data models

## Security Guidelines

### Secret Management

**NEVER commit secrets to the repository:**

```bash
# ❌ NEVER DO THIS
const jwtSecret = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."; // REAL TOKEN

# ✅ DO THIS INSTEAD
const authToken = process.env.ENTRA_CLIENT_SECRET || "your-entra-secret-here";
```

**Use placeholder values in code:**

```typescript
// ✅ GOOD: Use placeholders
const config = {
  entraClientSecret: process.env.ENTRA_CLIENT_SECRET || 'your-entra-secret-here',
  cosmosKey: process.env.COSMOS_DB_KEY || 'your-cosmos-key-here',
};
```

### Input Validation

**Always validate user inputs:**

```typescript
// ✅ Use Zod schemas for validation
const userSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
```

### Authentication & Authorization

- Use Microsoft Entra ID tokens for protected endpoints
- Implement proper role-based access control with VedUser standard
- Never trust client-side data
- Always verify user permissions on the server using JWKS validation

### Rate Limiting

- Use existing rate limiting middleware
- Configure appropriate limits for different endpoint types
- Monitor for abuse patterns

## Testing Requirements

### Frontend Testing

- Write unit tests for utilities and hooks using Jest
- Write component tests using React Testing Library
- Write end-to-end tests using Playwright
- Aim for >80% code coverage

### Backend Testing

- Write unit tests for all functions
- Write integration tests for API endpoints
- Test error handling scenarios
- Mock external dependencies

### Test Guidelines

- Test files should be in `__tests__` directories or use `.test.ts` suffix
- Write descriptive test names
- Test both success and failure scenarios
- Keep tests independent and deterministic

### Running Tests

```bash
# All tests
npm test

# Frontend tests only
cd frontend && npm test

# Backend tests only
cd backend && npm test

# End-to-end tests
npm run test:e2e

# Test coverage
npm run test:coverage
```

## Commit Message Guidelines

Use the [Conventional Commits](https://conventionalcommits.org/) specification:

```
<type>[optional scope]: <description>

[optional body]
```

**Types:**

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to the build process or auxiliary tools

**Examples:**

```
feat(auth): add password reset functionality
fix(trips): resolve duplicate booking issue
docs: update API documentation
test(user): add unit tests for user service
```

## Pull Request Process

1. **Create a feature branch** from `main`
2. **Make your changes** following the guidelines above
3. **Write or update tests** for your changes
4. **Update documentation** if necessary
5. **Run the full test suite** and ensure all tests pass
6. **Create a pull request** with:
   - Clear title and description
   - Reference to related issues
   - Screenshots (if UI changes)
   - Testing instructions

### Pull Request Requirements

- All checks must pass (tests, linting, type checking)
- At least one reviewer approval required
- Up-to-date with main branch
- No merge conflicts

### Review Process

- Code reviews focus on security, performance, and maintainability
- Reviewers will provide constructive feedback
- Address all comments before merging
- Squash commits when merging to keep history clean

## License Agreement

By contributing to Carpool, you agree that your contributions will be licensed under the same license as the project.

## Contact

- **Project Lead**: [Vedprakash Mishra](https://github.com/vedprakashmishra)
- **Issues**: [GitHub Issues](https://github.com/vedprakashmishra/carpool/issues)
- **Discussions**: [GitHub Discussions](https://github.com/vedprakashmishra/carpool/discussions)

---

Thank you for contributing to Carpool! Your efforts help make transportation more sustainable and accessible for everyone.
