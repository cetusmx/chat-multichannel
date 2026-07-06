const { processCsvBuffer } = require('../../src/utils/chunking');
jest.mock('pdf-parse', () => jest.fn());
describe('Chunking Utilities', () => {
  describe('processCsvBuffer', () => {
    it('should correctly map CSV rows to text chunks', async () => {
      const csvContent = "name,age,city\nJohn,30,New York\nAlice,25,London";
      const buffer = Buffer.from(csvContent, 'utf-8');
      
      const chunks = await processCsvBuffer(buffer);
      
      expect(chunks).toHaveLength(2);
      expect(chunks[0]).toBe('name: John, age: 30, city: New York');
      expect(chunks[1]).toBe('name: Alice, age: 25, city: London');
    });

    it('should handle empty CSV files gracefully', async () => {
      const buffer = Buffer.from('name,age,city\n', 'utf-8');
      
      const chunks = await processCsvBuffer(buffer);
      
      expect(chunks).toHaveLength(0);
    });
  });

  describe('processPdfBuffer', () => {
    it('should split text by paragraphs and filter short chunks', async () => {
      // Mock pdf-parse
      require('pdf-parse').mockResolvedValue({
        text: "Short.\n\nThis is a properly long paragraph that has enough characters to pass the minimum character filter length requirement."
      });
      
      const { processPdfBuffer } = require('../../src/utils/chunking');
      const chunks = await processPdfBuffer(Buffer.from('dummy'));
      
      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toContain('properly long paragraph');
    });

    it('should split very large paragraphs by sentences', async () => {
      // Create a huge paragraph made of 20 sentences. Each sentence is ~100 chars.
      const sentence = "This is a very long sentence designed to simulate a huge block of text that exceeds the limit. ";
      const hugeParagraph = sentence.repeat(15); // ~1500 chars
      
      require('pdf-parse').mockResolvedValue({
        text: hugeParagraph
      });
      
      const { processPdfBuffer } = require('../../src/utils/chunking');
      const chunks = await processPdfBuffer(Buffer.from('dummy'));
      
      // Should be chunked into at least 2 parts
      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks[0].length).toBeLessThanOrEqual(1005);
      expect(chunks[1].length).toBeLessThanOrEqual(1005);
    });
  });
});
