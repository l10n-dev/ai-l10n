# Contributing to ai-l10n

Thank you for your interest in contributing to ai-l10n! This document provides guidelines for contributing to the project.

## Development Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/AntonovAnton/ai-l10n.git
   cd ai-l10n
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Build the project:**
   ```bash
   npm run build
   ```

4. **Set up API key for testing:**
   ```bash
   export L10N_API_KEY=your_test_api_key
   ```

## Project Structure

```
src/
├── index.ts              # Main API
├── cli.ts                # CLI tool
├── apiKeyManager.ts      # API key management
├── translationService.ts # Translation service
├── i18nProjectManager.ts # Project structure handling
└── constants.ts          # Shared constants
```

## Development Workflow

1. **Make changes** in the `src/` directory
2. **Build** the project: `npm run build`
3. **Test locally** using `npm link`:
   ```bash
   npm link
   cd /path/to/test/project
   npm link ai-l10n
   ```
4. **Create a pull request** with your changes

## Coding Standards

- Use TypeScript for all new code
- Follow existing code style and conventions
- Add JSDoc comments for public APIs
- Keep functions focused and single-purpose
- Use meaningful variable and function names

## Testing

Currently, the project uses manual testing. To test your changes:

1. Create test localization files in a test project
2. Use the CLI to translate them
3. Verify the output is correct
4. Test error handling with invalid inputs

## Pull Request Process

1. **Fork the repository**
2. **Create a feature branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes** and commit with clear messages
4. **Build and test** your changes
5. **Push to your fork** and create a pull request
6. **Describe your changes** in the PR description

## Commit Message Guidelines

Use clear, descriptive commit messages:

- `feat: Add support for additional file formats`
- `fix: Correct language code validation`
- `docs: Update README with new examples`
- `refactor: Simplify translation logic`
- `chore: Update dependencies`

## Reporting Issues

When reporting issues, please include:

- Description of the problem
- Steps to reproduce
- Expected behavior
- Actual behavior
- Your environment (OS, Node version, etc.)
- Sample files if relevant

## Feature Requests

We welcome feature requests! Please open an issue with:

- Clear description of the feature
- Use case and benefits
- Possible implementation approach (optional)

## Code of Conduct

- Be respectful and constructive
- Welcome newcomers and help them learn
- Focus on what is best for the community
- Show empathy towards other community members

## Questions?

Feel free to:
- Open an issue for questions
- Email support@l10n.dev
- Check existing issues and discussions

## License

By contributing, you agree that your contributions will be licensed under the AGPL-3.0 License.

---

Thank you for contributing to ai-l10n! 🙏
