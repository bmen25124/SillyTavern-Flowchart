import { z } from 'zod';
import { schemaToText, flattenZodSchema } from '../../utils/schema-inspector.js';

describe('schema-inspector', () => {
  describe('schemaToText', () => {
    it('should convert string schema to text', () => {
      const schema = z.string();
      const text = schemaToText(schema);
      expect(text).toBe('string');
    });

    it('should convert number schema to text', () => {
      const schema = z.number();
      const text = schemaToText(schema);
      expect(text).toBe('number');
    });

    it('should convert boolean schema to text', () => {
      const schema = z.boolean();
      const text = schemaToText(schema);
      expect(text).toBe('boolean');
    });

    it('should convert object schema to text', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });
      const text = schemaToText(schema);
      expect(text).toContain('name: string');
      expect(text).toContain('age: number');
    });

    it('should convert array schema to text', () => {
      const schema = z.array(z.string());
      const text = schemaToText(schema);
      expect(text).toBe('Array<string>');
    });

    it('should convert enum schema to text', () => {
      const schema = z.enum(['a', 'b', 'c']);
      const text = schemaToText(schema);
      expect(text).toBe('enum');
    });

    it('should handle optional schema', () => {
      const schema = z.string().optional();
      const text = schemaToText(schema);
      expect(text).toBe('string');
    });

    it('should handle nullable schema', () => {
      const schema = z.string().nullable();
      const text = schemaToText(schema);
      expect(text).toBe('string');
    });
  });

  describe('flattenZodSchema', () => {
    it('should flatten object schema to dot notation paths', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
        address: z.object({
          street: z.string(),
          city: z.string(),
        }),
      });
      const paths = flattenZodSchema(schema);
      expect(paths).toContain('name');
      expect(paths).toContain('age');
      expect(paths).toContain('address.street');
      expect(paths).toContain('address.city');
    });

    it('should flatten array schema to bracket notation paths', () => {
      const schema = z.object({
        items: z.array(
          z.object({
            name: z.string(),
          }),
        ),
      });
      const paths = flattenZodSchema(schema);
      expect(paths).toContain('items.name');
    });

    it('should handle optional schema', () => {
      const schema = z.object({
        name: z.string().optional(),
      });
      const paths = flattenZodSchema(schema);
      expect(paths).toContain('name');
    });

    it('should handle nullable schema', () => {
      const schema = z.object({
        name: z.string().nullable(),
      });
      const paths = flattenZodSchema(schema);
      expect(paths).toContain('name');
    });

    it('should handle empty object schema', () => {
      const schema = z.object({});
      const paths = flattenZodSchema(schema);
      expect(paths).toEqual([]);
    });
  });
});
