# Test Suite Documentation

## Quick Start

```bash
# Install dependencies
npm install

# Run all unit tests
npm run test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch

# Run E2E tests
npm run test:e2e

# Run all tests
npm run test:all
```

## Test Structure

```
tests/
├── setup.ts                      # Global test setup
├── lib/
│   ├── services/
│   │   ├── date.test.ts         # 54 tests
│   │   ├── phone.test.ts        # 48 tests
│   │   ├── plate.test.ts        # 52 tests
│   │   └── notification.test.ts # 72 tests
│   └── validation/
│       └── schemas.test.ts      # 125 tests
├── components/
│   └── Button.test.tsx          # 45 tests
├── integration/
│   └── api/
│       └── reminders.test.ts    # 45 tests
└── e2e/
    └── reminder-flow.spec.ts    # 25 tests
```

## Test Categories

### Unit Tests (400+ tests)
Test individual functions and components in isolation.

**Coverage Target:** >85%

### Integration Tests (75 tests)
Test API routes, database operations, and service interactions.

**Coverage Target:** >85%

### E2E Tests (25 tests)
Test complete user workflows from UI to database.

**Coverage Target:** Critical paths only

## Writing Tests

### Unit Test Example

```typescript
import { describe, it, expect } from 'vitest';
import { formatDate } from '@/lib/services/date';

describe('formatDate', () => {
  it('should format date with default format', () => {
    const date = new Date('2025-12-31');
    expect(formatDate(date)).toBe('31.12.2025');
  });
});
```

### Component Test Example

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@/components/button';

describe('Button', () => {
  it('should handle click events', async () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    await userEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalled();
  });
});
```

### E2E Test Example

```typescript
import { test, expect } from '@playwright/test';

test('should create reminder', async ({ page }) => {
  await page.goto('/reminders/new');
  await page.fill('[name="plate_number"]', 'B-123-ABC');
  await page.click('button[type="submit"]');

  await expect(page.locator('text=B-123-ABC')).toBeVisible();
});
```

## Best Practices

### Test Naming
- **Descriptive**: Explain what and why
- **Pattern**: `should [expected behavior] when [condition]`
- **Examples**:
  - ✅ `should return formatted phone for valid input`
  - ❌ `test phone function`

### Test Structure (AAA)
```typescript
it('should validate email', () => {
  // Arrange
  const email = 'test@example.com';

  // Act
  const result = validateEmail(email);

  // Assert
  expect(result).toBe(true);
});
```

### Test Isolation
- No dependencies between tests
- Reset state before each test
- Use `beforeEach` for setup
- Mock external dependencies

### Edge Cases
Always test:
- Empty/null values
- Boundary values (0, negative, max)
- Invalid input formats
- Romanian-specific cases
- Error conditions

## Mocking

### Supabase Client
```typescript
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ data: {...}, error: null }),
    })),
  }),
}));
```

### Next.js Router
```typescript
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));
```

## Coverage Reports

### Viewing Coverage
```bash
# Generate coverage report
npm run test:coverage

# Open HTML report
open coverage/index.html
```

### Coverage Thresholds
- Statements: 85%
- Branches: 75%
- Functions: 80%
- Lines: 85%

## Debugging Tests

### Run Single Test File
```bash
npm run test -- date.test.ts
```

### Run Single Test
```bash
npm run test -- -t "should format date"
```

### Debug with UI
```bash
npm run test:ui
```

### Playwright Debug
```bash
npm run test:e2e -- --debug
```

## CI/CD Integration

Tests run automatically on:
- Push to main/develop
- Pull requests
- Manual workflow dispatch

See `.github/workflows/test.yml` for full configuration.

## Common Issues

### Issue: Tests fail due to date/time
**Solution:** Mock system time
```typescript
vi.useFakeTimers();
vi.setSystemTime(new Date('2025-01-15'));
```

### Issue: Component not rendering
**Solution:** Check setup.ts for required mocks

### Issue: Async tests timing out
**Solution:** Use `await` with async operations
```typescript
await waitFor(() => {
  expect(screen.getByText('Success')).toBeVisible();
});
```

## Performance

### Test Execution Times
- Unit tests: ~2-3 seconds
- Integration tests: ~15-20 seconds
- E2E tests: ~2-3 minutes

### Optimization Tips
- Use `.skip()` for temporarily disabled tests
- Use `.only()` during development
- Run unit tests in watch mode
- Run E2E tests only before commits

## Resources

- [Vitest Documentation](https://vitest.dev)
- [Playwright Documentation](https://playwright.dev)
- [Testing Library](https://testing-library.com)
- [Test Pyramid Strategy](/docs/testing/test-pyramid-strategy.md)
- [Test Summary](/docs/testing/test-summary.md)

## Contributing

When adding new features:
1. Write tests first (TDD)
2. Ensure >85% coverage
3. Include edge cases
4. Update documentation
5. Run full test suite before PR

## Questions?

Contact the Testing Team or check:
- Internal Wiki
- Team Slack #testing
- GitHub Discussions
