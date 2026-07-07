const prisma = require('../config/database');
const ApiError = require('../utils/ApiError');
const aiService = require('./ai.service');
const { extractAndChunkDocument } = require('../utils/chunking');

class KnowledgeBaseService {
  
  async uploadDocument(tenantId, file) {
    if (!file) throw new ApiError(400, 'No file uploaded');

    const { originalname, size, buffer, mimetype } = file;

    // 1. Create a Document record in PROCESSING state
    const document = await prisma.document.create({
      data: {
        tenantId,
        filename: originalname,
        size,
        status: 'PROCESSING'
      }
    });

    // 2. Process chunks asynchronously to avoid timeout
    // In a real production app we'd use a queue (e.g. BullMQ), but we'll do it in background here
    this._processDocumentInBackground(tenantId, document.id, buffer, mimetype).catch(err => {
      console.error(`Error processing document ${document.id}:`, err);
    });

    return document;
  }

  async _processDocumentInBackground(tenantId, documentId, buffer, mimetype) {
    try {
      // 1. Extract and chunk text
      const chunks = await extractAndChunkDocument(buffer, mimetype);
      
      if (!chunks || chunks.length === 0) {
        throw new Error('No text could be extracted from the document');
      }

      // 2. Embed and Save in transaction
      // Since generating embeddings takes time and can fail, we process them in batches or sequentially.
      // We will embed them first, then save them all in a transaction.
      const chunkData = [];
      for (const text of chunks) {
        // Embed each chunk via aiService
        const embedding = await aiService.embed(tenantId, text);
        chunkData.push({ text, embedding });
      }

      // Save chunks within transaction and update status
      await prisma.$transaction(async (tx) => {
        for (const data of chunkData) {
          // Format embedding array as string '[0.1, 0.2, ...]' for pgvector
          const embeddingStr = JSON.stringify(data.embedding);
          const chunkId = require('crypto').randomUUID();
          
          await tx.$executeRaw`
            INSERT INTO "document_chunks" ("id", "text", "embedding", "document_id", "tenant_id", "created_at", "updated_at")
            VALUES (${chunkId}, ${data.text}, ${embeddingStr}::vector, ${documentId}, ${tenantId}, NOW(), NOW())
          `;
        }

        await tx.document.update({
          where: { id: documentId },
          data: { status: 'READY' }
        });
      });

    } catch (error) {
      console.error(`Document processing failed for ${documentId}:`, error);
      await prisma.document.update({
        where: { id: documentId },
        data: { status: 'ERROR' }
      });
    }
  }

  async getDocuments(tenantId) {
    return await prisma.document.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async searchSimilarChunks(tenantId, query, limit = 3) {
    if (!query) throw new ApiError(400, 'Search query cannot be empty');
    
    // Embed the query
    const embedding = await aiService.embed(tenantId, query);
    const embeddingStr = JSON.stringify(embedding);

    // Run similarity search
    const results = await prisma.$queryRaw`
      SELECT text, 1 - (embedding <=> CAST(${embeddingStr} AS vector)) as similarity
      FROM document_chunks
      WHERE tenant_id = ${tenantId}
      ORDER BY embedding <=> CAST(${embeddingStr} AS vector)
      LIMIT ${limit};
    `;

    return results;
  }

}

module.exports = new KnowledgeBaseService();
