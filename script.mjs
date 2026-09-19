import fs from 'fs';

const filePath = 'src/features/market-intelligence/jobs/accountIntelligenceInsights.worker.ts';
let code = fs.readFileSync(filePath, 'utf8');

const regex = /const companies = await requestContext\.run\(\{ tenantId: organizationId \}, \(\) =>[\s\S]*?prisma\.company\.findMany\(\{[\s\S]*?take: Math\.min\([\s\S]*?\),[\s\S]*?\}\),[\s\S]*?\);/m;

const replacement = const companies = await requestContext.run({ tenantId: organizationId }, async () => {
      const takeLimit = Math.min(
        MAX_ACCOUNTS_PER_ORGANIZATION_PER_TICK,
        MAX_ACCOUNTS_PER_TICK - accounts.length,
      );

      const cutoffHot = new Date(now.getTime() - 1 * 60 * 60 * 1000); // 1 hora
      const cutoffWarm = new Date(now.getTime() - 12 * 60 * 60 * 1000); // 12 horas
      const cutoffCold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 dias

      // HOT (lookalikeScore >= 80)
      const hotCompanies = await prisma.company.findMany({
        where: {
          deletedAt: null,
          lookalikeScore: { gte: 80 },
          intelligenceSnapshots: { none: { createdAt: { gte: cutoffHot } } },
        },
        select: { id: true, lookalikeScore: true, cnpj: true, qsa: true, website: true },
        take: takeLimit,
      });

      if (hotCompanies.length >= takeLimit) return hotCompanies;

      // WARM (lookalikeScore >= 50 && < 80)
      const warmCompanies = await prisma.company.findMany({
        where: {
          deletedAt: null,
          lookalikeScore: { gte: 50, lt: 80 },
          intelligenceSnapshots: { none: { createdAt: { gte: cutoffWarm } } },
        },
        select: { id: true, lookalikeScore: true, cnpj: true, qsa: true, website: true },
        take: takeLimit - hotCompanies.length,
      });

      if (hotCompanies.length + warmCompanies.length >= takeLimit) {
        return [...hotCompanies, ...warmCompanies];
      }

      // COLD (lookalikeScore < 50 ou null)
      const coldCompanies = await prisma.company.findMany({
        where: {
          deletedAt: null,
          OR: [{ lookalikeScore: { lt: 50 } }, { lookalikeScore: null }],
          intelligenceSnapshots: { none: { createdAt: { gte: cutoffCold } } },
        },
        select: { id: true, lookalikeScore: true, cnpj: true, qsa: true, website: true },
        take: takeLimit - hotCompanies.length - warmCompanies.length,
      });

      return [...hotCompanies, ...warmCompanies, ...coldCompanies];
    });;

code = code.replace(regex, replacement);
fs.writeFileSync(filePath, code);
