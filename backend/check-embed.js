const { GoogleGenerativeAI } = require('@google/generative-ai');
const { PrismaClient } = require('@prisma/client');
const { decrypt } = require('./src/utils/encryption');
require('dotenv').config();

const prisma = new PrismaClient();

async function run() {
  try {
    const config = await prisma.aIConfig.findFirst();
    const apiKey = decrypt(config.apiKey);
    const genAI = new GoogleGenerativeAI(apiKey);

    const models = ['text-embedding-004', 'embedding-001', 'text-embedding-gecko'];
    
    for (const m of models) {
      try {
        console.log(`Testing ${m}...`);
        const model = genAI.getGenerativeModel({ model: m });
        const res = await model.embedContent('hello world');
        console.log(`- ${m} dimensions:`, res.embedding.values.length);
      } catch (err) {
        console.log(`- ${m} failed: ${err.message}`);
      }
    }
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
run();
