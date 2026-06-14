module.exports = {
  initLlama: jest.fn().mockImplementation(() => {
    return Promise.resolve({
      completion: jest.fn().mockResolvedValue({ text: 'Mock LLM response' }),
      clearCache: jest.fn().mockResolvedValue(),
      release: jest.fn().mockResolvedValue()
    });
  }),
  loadLlamaModelInfo: jest.fn().mockResolvedValue({
    modelSize: 1024 * 1024
  })
};
