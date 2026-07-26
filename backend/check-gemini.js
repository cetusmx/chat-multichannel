const { PrismaClient } = require('@prisma/client');
const { decrypt } = require('./src/utils/encryption');

const prisma = new PrismaClient();

async function run() {
  try {
    const config = await prisma.aiConfig.findFirst();
    if (!config) {
      console.log('No AI config found');
      return;
    }
    
    // In order for encryption to work, we need to ensure ENCRYPTION_KEY is loaded
    require('dotenv').config({ path: '../.env' });
    if (!process.env.ENCRYPTION_KEY) {
      process.env.ENCRYPTION_KEY = '12345678901234567890123456789012';
    }

    const key = decrypt(config.apiKey);
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
    const data = await res.json();
    
    if (data.error) {
      console.error('API Error:', data.error);
      return;
    }
    
    console.log('Available models for your API Key:');
    data.models.forEach(m => {
      console.log(`- ${m.name}`);
    });
  } catch (error) {
    console.error('Script error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

run();
