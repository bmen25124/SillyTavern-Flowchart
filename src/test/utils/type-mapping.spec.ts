import { z } from 'zod';
import { zodTypeToFlowType, valueToFlowType } from '../../utils/type-mapping.js';
import { FlowDataType } from '../../flow-types.js';

describe('type-mapping', () => {
  describe('zodTypeToFlowType', () => {
    it('should map string schema to STRING type', () => {
      const schema = z.string();
      const type = zodTypeToFlowType(schema);
      expect(type).toBe(FlowDataType.STRING);
    });

    it('should map number schema to NUMBER type', () => {
      const schema = z.number();
      const type = zodTypeToFlowType(schema);
      expect(type).toBe(FlowDataType.NUMBER);
    });

    it('should map boolean schema to BOOLEAN type', () => {
      const schema = z.boolean();
      const type = zodTypeToFlowType(schema);
      expect(type).toBe(FlowDataType.BOOLEAN);
    });

    it('should map object schema to OBJECT type', () => {
      const schema = z.object({ name: z.string() });
      const type = zodTypeToFlowType(schema);
      expect(type).toBe(FlowDataType.OBJECT);
    });

    it('should map array schema to ARRAY type', () => {
      const schema = z.array(z.string());
      const type = zodTypeToFlowType(schema);
      expect(type).toBe(FlowDataType.ARRAY);
    });

    it('should map enum schema to OBJECT type', () => {
      const schema = z.enum(['a', 'b', 'c']);
      const type = zodTypeToFlowType(schema);
      expect(type).toBe(FlowDataType.OBJECT);
    });

    it('should map unknown schema to ANY type', () => {
      const schema = z.any();
      const type = zodTypeToFlowType(schema);
      expect(type).toBe(FlowDataType.ANY);
    });
  });

  describe('valueToFlowType', () => {
    it('should map string value to STRING type', () => {
      const type = valueToFlowType('test');
      expect(type).toBe(FlowDataType.STRING);
    });

    it('should map number value to NUMBER type', () => {
      const type = valueToFlowType(42);
      expect(type).toBe(FlowDataType.NUMBER);
    });

    it('should map boolean value to BOOLEAN type', () => {
      const type = valueToFlowType(true);
      expect(type).toBe(FlowDataType.BOOLEAN);
    });

    it('should map object value to OBJECT type', () => {
      const type = valueToFlowType({ name: 'test' });
      expect(type).toBe(FlowDataType.OBJECT);
    });

    it('should map array value to ARRAY type', () => {
      const type = valueToFlowType(['test']);
      expect(type).toBe(FlowDataType.ARRAY);
    });

    it('should map null value to ANY type', () => {
      const type = valueToFlowType(null);
      expect(type).toBe(FlowDataType.ANY);
    });

    it('should map undefined value to ANY type', () => {
      const type = valueToFlowType(undefined);
      expect(type).toBe(FlowDataType.ANY);
    });
  });
});
