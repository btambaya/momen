/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        // Relax for tests - no need for strict JSX checking
        jsx: 'react',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    }],
  },
  // Mock native modules that aren't available in Node test env
  moduleNameMapper: {
    '^expo-sqlite$': '<rootDir>/src/__mocks__/expo-sqlite.ts',
    '^expo-file-system$': '<rootDir>/src/__mocks__/expo-file-system.ts',
    '^expo-sharing$': '<rootDir>/src/__mocks__/expo-sharing.ts',
    '^expo-haptics$': '<rootDir>/src/__mocks__/expo-haptics.ts',
    '^react-native$': '<rootDir>/src/__mocks__/react-native.ts',
    '^uuid$': '<rootDir>/src/__mocks__/uuid.ts',
  },
  collectCoverageFrom: [
    'src/engine/**/*.ts',
    'src/export/**/*.ts',
    '!src/**/__tests__/**',
    '!src/**/__mocks__/**',
  ],
};
