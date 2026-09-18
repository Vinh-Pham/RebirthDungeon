import { defineConfig } from 'vitest/config';
export default defineConfig({
    test: {
        include: ['tests/unit/**/*.test.{ts,tsx}'],
        coverage: {
            provider: 'v8',
            include: [
                'src/domain/**/*.ts',
                'src/runtime/machines.ts',
                'src/runtime/persistence.ts',
            ],
            reporter: ['text', 'html'],
            thresholds: { lines: 90, branches: 90, statements: 90, functions: 90 },
        },
    },
});
