import { recordModelLoad, recordInference, getTelemetryData, resetTelemetry } from '../../../../LegalAI/src/services/telemetry';
import modelManager from '../../../../LegalAI/src/services/modelManager';
import useDocumentStore from '../../../../LegalAI/src/store/useDocumentStore';

jest.mock('../../../../LegalAI/src/services/modelManager', () => ({
  getStatus: () => 'ready',
  getActiveModel: () => ({ id: 'qwen-2.5-3b' })
}));

describe('Telemetry Service', () => {
  beforeEach(() => {
    resetTelemetry();
    useDocumentStore.getState().clearAll();
  });

  it('should record model load duration and calculate estimated RAM usage', () => {
    recordModelLoad(4500); // 4.5 seconds

    const data = getTelemetryData();
    expect(data.modelLoadTime).toBe(4500);
    // Estimated RAM usage: base 180MB + 1850MB (Qwen 3B) = 2030MB
    expect(data.ramUsageMB).toBe(2030);
  });

  it('should record inference metrics and compute tokens/sec speed', () => {
    // 50 tokens generated over 2000 milliseconds
    recordInference(50, 2000);

    const data = getTelemetryData();
    expect(data.lastInferenceTime).toBe(2000);
    expect(data.lastInferenceSpeed).toBe(25); // 50 / 2 = 25 tokens/sec
    expect(data.totalTokensGenerated).toBe(50);
  });
});
