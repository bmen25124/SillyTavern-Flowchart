import { z } from 'zod';
import {
  buildZodSchema,
  buildZodSchemaFromFields,
  jsonItemToZod,
  inferSchemaFromJsonNode,
  valueToZodSchema,
} from '../../utils/schema-builder.js';
import { SchemaTypeDefinition, FieldDefinition } from '../../components/nodes/SchemaNode/definition.js';
import { JsonNodeData, JsonNodeItem } from '../../components/nodes/JsonNode/definition.js';

describe('schema-builder', () => {
  describe('buildZodSchema', () => {
    it('should build string schema', () => {
      const definition: SchemaTypeDefinition = { type: 'string' };
      const schema = buildZodSchema(definition);
      expect(schema).toBeInstanceOf(z.ZodString);
    });

    it('should build number schema', () => {
      const definition: SchemaTypeDefinition = { type: 'number' };
      const schema = buildZodSchema(definition);
      expect(schema).toBeInstanceOf(z.ZodNumber);
    });

    it('should build boolean schema', () => {
      const definition: SchemaTypeDefinition = { type: 'boolean' };
      const schema = buildZodSchema(definition);
      expect(schema).toBeInstanceOf(z.ZodBoolean);
    });

    it('should build enum schema', () => {
      const definition: SchemaTypeDefinition = { type: 'enum', values: ['a', 'b', 'c'] };
      const schema = buildZodSchema(definition);
      expect(schema).toBeInstanceOf(z.ZodEnum);
    });

    it('should build object schema from fields', () => {
      const definition: SchemaTypeDefinition = {
        type: 'object',
        fields: [{ id: '1', name: 'name', type: 'string' }],
      };
      const schema = buildZodSchema(definition);
      expect(schema).toBeInstanceOf(z.ZodObject);
    });

    it('should build array schema', () => {
      const definition: SchemaTypeDefinition = {
        type: 'array',
        items: { type: 'string' },
      };
      const schema = buildZodSchema(definition);
      expect(schema).toBeInstanceOf(z.ZodArray);
    });

    it('should add description to schema', () => {
      const definition: SchemaTypeDefinition = {
        type: 'string',
        description: 'A test string',
      };
      const schema = buildZodSchema(definition);
      expect(schema.description).toBe('A test string');
    });
  });

  describe('buildZodSchemaFromFields', () => {
    it('should build object schema from field definitions', () => {
      const fields: FieldDefinition[] = [
        { id: '1', name: 'name', type: 'string' },
        { id: '2', name: 'age', type: 'number' },
      ];
      const schema = buildZodSchemaFromFields(fields);
      expect(schema).toBeInstanceOf(z.ZodObject);
      expect(schema.shape.name).toBeInstanceOf(z.ZodString);
      expect(schema.shape.age).toBeInstanceOf(z.ZodNumber);
    });
  });

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
  });

  describe('valueToZodSchema', () => {
    it('should convert string value to zod schema', () => {
      const schema = valueToZodSchema('test');
      expect(schema).toBeInstanceOf(z.ZodString);
    });

    it('should convert number value to zod schema', () => {
      const schema = valueToZodSchema(42);
      expect(schema).toBeInstanceOf(z.ZodNumber);
    });

    it('should convert boolean value to zod schema', () => {
      const schema = valueToZodSchema(true);
      expect(schema).toBeInstanceOf(z.ZodBoolean);
    });

    it('should convert object value to zod schema', () => {
      const schema = valueToZodSchema({ name: 'test' });
      expect(schema).toBeInstanceOf(z.ZodObject);
    });

    it('should convert array value to zod schema', () => {
      const schema = valueToZodSchema(['test']);
      expect(schema).toBeInstanceOf(z.ZodArray);
    });
  });
});
