module.exports = {
  moduleNameMapper: {
    '^~/(.*)$': '<rootDir>/$1',
  },
  "roots": [
    "<rootDir>"
  ],
  "testMatch": [
    "**/?(*.)+(spec|test).+(ts|tsx)"
  ],
  "transform": {
    "^.+\\.(ts|tsx)$": "esbuild-jest"
  },
  "setupFilesAfterEnv": [ "fake-indexeddb/auto"],
  "testEnvironment": "jsdom"
  // "testEnvironment": "node"
}