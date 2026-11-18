/* global jest */
// Native modules without a JS fallback in Jest.
jest.mock("@react-native-community/netinfo", () => require("@react-native-community/netinfo/jest/netinfo-mock.js"));
