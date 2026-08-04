import { searchCorpusMetadata, getActMetadata, RETRIEVAL_GUIDELINES } from '../../../../LegalAI/src/services/corpusManager';

describe('Corpus Manager Service', () => {
  it('should search acts by name or abbreviation', async () => {
    const results = await searchCorpusMetadata('BNS');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].abbreviation).toBe('BNS');
  });

  it('should retrieve act details by id', async () => {
    const act = await getActMetadata('ipc_1860');
    expect(act.name).toBe('Indian Penal Code');
    expect(act.totalSections).toBe(511);
  });

  it('should have search retrieval guidelines', () => {
    expect(RETRIEVAL_GUIDELINES.defaultTopK).toBe(3);
  });
});
