module.exports = {
  launch: jest.fn().mockResolvedValue({
    newPage: jest.fn().mockResolvedValue({
      setContent: jest.fn().mockResolvedValue(true),
      pdf: jest.fn().mockResolvedValue(Buffer.from('mock pdf content')),
      close: jest.fn().mockResolvedValue(true)
    }),
    close: jest.fn().mockResolvedValue(true)
  })
};
