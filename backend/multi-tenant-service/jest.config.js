/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
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
        },
      },
    ],
  },
  moduleNameMapper: {
    "^../../../common/(.*)$": "<rootDir>/../../common/$1",
    "^../../common/(.*)$": "<rootDir>/../common/$1",
    "^../../../../common/(.*)$": "<rootDir>/../../common/$1",
  },
  testTimeout: 10000,
};
