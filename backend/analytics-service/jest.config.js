/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests", "<rootDir>/src"],
  testMatch: ["**/*.test.ts", "**/*.spec.ts"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          strict: false,
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          skipLibCheck: true,
          rootDir: "..",
        },
      },
    ],
  },
  moduleNameMapper: {
    "^../../../common/(.*)$": "<rootDir>/../../common/$1",
    "^../../common/(.*)$": "<rootDir>/../common/$1",
  },
  // Resolve modules from the monorepo root node_modules
  modulePaths: ["<rootDir>/../node_modules"],
  moduleDirectories: ["node_modules", "<rootDir>/../node_modules"],
  collectCoverageFrom: ["src/**/*.ts", "!src/**/*.d.ts"],
  testTimeout: 10000,
};
