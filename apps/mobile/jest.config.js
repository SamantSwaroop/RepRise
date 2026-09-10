module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!(.pnpm|((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@reprise/.*))',
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
};
