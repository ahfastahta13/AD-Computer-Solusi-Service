const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

p.knowledgeBase.findMany()
  .then(d => {
    console.log('Knowledge Base Count:', d.length);
    console.log(JSON.stringify(d, null, 2));
  })
  .catch(e => console.error('ERROR:', e.message))
  .finally(() => p.$disconnect());
