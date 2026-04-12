/** @type {import("ts-jest").JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests", "<rootDir>/src"],
  testMatch: ["**/*.test.ts", "**/*.spec.ts"],
  setupFiles: ["<rootDir>/../__mocks__/jest.setup.js"],
  clearMocks: true,
  transform: {
    "^.+\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          strict: false,
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          skipLibCheck: true,
          rootDir: "..",
        },
        diagnostics: false,
      },
    ],
  },
  moduleNameMapper: {
    "^@prisma/client$": "<rootDir>/../__mocks__/@prisma/client.js",
    "^square$": "<rootDir>/../__mocks__/square.js",
    "^\.\./\.\./(common/.*)$": "<rootDir>/../$1",
    "^\.\./\.\./\.\./(common/.*)$": "<rootDir>/../$1",
  },
  modulePaths: ["<rootDir>/../node_modules"],
  moduleDirectories: ["node_modules", "<rootDir>/../node_modules"],
  collectCoverageFrom: ["src/**/*.ts", "!src/**/*.d.ts"],
  testTimeout: 10000,
};
