import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock environment variables for tests
process.env['NEXT_PUBLIC_SUPABASE_URL'] = 'https://test.supabase.co';
process.env['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'] = 'test-publishable-key';
process.env['SUPABASE_SERVICE_ROLE_KEY'] = 'test-service-key';
process.env['DATABASE_URL'] = 'postgresql://test:test@localhost:5432/test';
process.env['ANTHROPIC_API_KEY'] = 'sk-ant-test';
process.env['UPSTASH_REDIS_REST_URL'] = 'https://test.upstash.io';
process.env['UPSTASH_REDIS_REST_TOKEN'] = 'test-token';
process.env['NEXT_PUBLIC_APP_URL'] = 'http://localhost:3000';
// @ts-expect-error -- NODE_ENV is read-only in types but writable at runtime for test setup
process.env['NODE_ENV'] = 'test';
process.env['LOG_LEVEL'] = 'error';
