module.exports = {
  NativeModules: {
    PdfExtractor: null // Trigger simulated text fallback in pdfService
  },
  Platform: {
    OS: 'android',
    select: (obj) => obj.android || obj.default
  },
  Alert: {
    alert: jest.fn()
  },
  Dimensions: {
    get: jest.fn().mockReturnValue({ width: 375, height: 812 })
  }
};
