import { z } from 'zod';
import { inferSchemaFromJsonNode } from '../../utils/schema-inference.js';
import { JsonNodeData, JsonNodeItem } from '../../components/nodes/JsonNode/definition.js';
import { jsonItemToZod } from '../../utils/schema-builder.js';

describe('schema-inference', () => {
  describe('jsonItemToZod', () => {
    it('should convert string item to zod schema', () => {
      const item: JsonNodeItem = { id: '1', type: 'string', key: 'test', value: 'test' };
      const schema = jsonItemToZod(item);
      expect(schema).toBeInstanceOf(z.ZodString);
    });

    it('should convert number item to zod schema', () => {
      const item: JsonNodeItem = { id: '1', type: 'number', key: 'test', value: 42 };
      const schema = jsonItemToZod(item);
      expect(schema).toBeInstanceOf(z.ZodNumber);
    });

    it('should convert boolean item to zod schema', () => {
      const item: JsonNodeItem = { id: '1', type: 'boolean', key: 'test', value: true };
      const schema = jsonItemToZod(item);
      expect(schema).toBeInstanceOf(z.ZodBoolean);
    });

    it('should convert array item to zod schema', () => {
      const item: JsonNodeItem = {
        id: '1',
        type: 'array',
        key: 'test',
        value: [{ id: '2', type: 'string', key: '0', value: 'test' }],
      };
      const schema = jsonItemToZod(item);
      expect(schema).toBeInstanceOf(z.ZodArray);
    });

    it('should convert object item to zod schema', () => {
      const item: JsonNodeItem = {
        id: '1',
        type: 'object',
        key: 'test',
        value: [{ id: '2', type: 'string', key: 'name', value: 'test' }],
      };
      const schema = jsonItemToZod(item);
      expect(schema).toBeInstanceOf(z.ZodObject);
    });

    it('should handle empty array item', () => {
      const item: JsonNodeItem = {
        id: '1',
        type: 'array',
        key: 'test',
        value: [],
      };
      const schema = jsonItemToZod(item);
      expect(schema).toBeInstanceOf(z.ZodArray);
    });
  });

  describe('inferSchemaFromJsonNode', () => {
    it('should infer schema from object data', () => {
      const data: JsonNodeData = {
        rootType: 'object',
        items: [
          { id: '1', type: 'string', key: 'name', value: 'test' },
          { id: '2', type: 'number', key: 'age', value: 42 },
        ],
      };
      const schema = inferSchemaFromJsonNode(data);
      expect(schema).toBeInstanceOf(z.ZodObject);
      expect((schema as z.ZodObject<any>).shape.name).toBeInstanceOf(z.ZodString);
      expect((schema as z.ZodObject<any>).shape.age).toBeInstanceOf(z.ZodNumber);
    });

    it('should infer schema from array data', () => {
      const data: JsonNodeData = {
        rootType: 'array',
        items: [{ id: '1', type: 'string', key: '0', value: 'test' }],
      };
      const schema = inferSchemaFromJsonNode(data);
      expect(schema).toBeInstanceOf(z.ZodArray);
    });

    it('should handle empty object data', () => {
      const data: JsonNodeData = {
        rootType: 'object',
        items: [],
      };
      const schema = inferSchemaFromJsonNode(data);
      expect(schema).toBeInstanceOf(z.ZodObject);
    });
  });
});
