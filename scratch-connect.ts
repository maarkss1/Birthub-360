import { prisma } from './src/lib/prisma.ts';
import { connectBitrix } from './src/features/integrations/bitrix/service/connections.ts';

async function main() {
  const orgs = await prisma.organization.findMany();
  console.log('Orgs encontradas:', orgs.map(o => o.name));

  for (const org of orgs) {
    if (org.name.toLowerCase().includes('atlas') || org.name.toLowerCase().includes('oracle') || org.name.toLowerCase().includes('totaltrac')) {
      console.log(`Conectando org: ${org.name}`);
      try {
        const result = await connectBitrix(org.id, 'https://atlasgr.bitrix24.com.br/rest/450/gr94fas79p1nizci/', org.name + ' Bitrix24');
        console.log(`Sucesso na org ${org.name}:`, result);
      } catch (err) {
        console.error(`Falha na org ${org.name}:`, err.message);
      }
    }
  }
}

main().catch(console.error).finally(() => process.exit(0));
