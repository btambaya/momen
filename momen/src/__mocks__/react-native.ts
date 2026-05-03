// Minimal react-native stub for the test environment
export const Platform = { OS: 'ios', select: (obj: any) => obj.ios ?? obj.default };
export const StyleSheet = { create: (s: any) => s, absoluteFillObject: {} };
export const Alert = { alert: jest.fn() };
