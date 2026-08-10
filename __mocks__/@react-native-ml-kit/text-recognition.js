jest.mock('@react-native-ml-kit/text-recognition', () => ({
  __esModule: true,
  default: {
    recognize: jest.fn(async () => ({ text: '', blocks: [] })),
  },
  TextRecognitionScript: {
    LATIN: 'Latin',
    CHINESE: 'Chinese',
    DEVANAGARI: 'Devanagari',
    JAPANESE: 'Japanese',
    KOREAN: 'Korean',
  },
}));
