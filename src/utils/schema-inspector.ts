import { z } from 'zod';

function getZodShape(schema: z.ZodType): Record<string, z.ZodType> | null {
  if (schema instanceof z.ZodObject) {
    return schema.shape;
  }
  // Handle optional, nullable, etc. wrappers
  if ('unwrap' in schema && typeof schema.unwrap === 'function') {
    // @ts-ignore
    return getZodShape(schema.unwrap());
  }
  if ('innerType' in schema && typeof schema.innerType === 'function') {
    // @ts-ignore
    return getZodShape(schema.innerType());
  }
  return null;
}

function formatTypeName(schema: z.ZodType): string {
  if (schema instanceof z.ZodObject) return 'object';
  // @ts-ignore
  if (schema instanceof z.ZodArray) return `Array<${formatTypeName(schema.element)}>`;
  if (schema instanceof z.ZodString) return 'string';
  if (schema instanceof z.ZodNumber) return 'number';
  if (schema instanceof z.ZodBoolean) return 'boolean';
  if (schema instanceof z.ZodEnum) return `enum`;
  if ('unwrap' in schema && typeof schema.unwrap === 'function') return formatTypeName(schema.unwrap());
  if ('innerType' in schema && typeof schema.innerType === 'function') return formatTypeName(schema.innerType());
  return 'any';
}

export function schemaToText(schema: z.ZodType, indent = 0): string {
  const indentation = '  '.repeat(indent);
  const shape = getZodShape(schema);

  if (shape) {
    const entries = Object.entries(shape)
      .map(([key, value]) => {
        const description = value.description ? ` // ${value.description}` : '';
        const valueShape = getZodShape(value);
        if (valueShape) {
          return `${indentation}  ${key}: {\n${schemaToText(value, indent + 2)}\n${indentation}  }${description}`;
        }
        return `${indentation}  ${key}: ${formatTypeName(value)}${description}`;
      })
      .join('\n');
    return `{\n${entries}\n${indentation}}`;
  }

  return formatTypeName(schema);
}

// Helper to generate a flat list of dot-notation paths from a Zod schema.
export function flattenZodSchema(schema: z.ZodType, prefix = ''): string[] {
  if ('unwrap' in schema && typeof schema.unwrap === 'function') {
    // @ts-ignore
    return flattenZodSchema(schema.unwrap(), prefix);
  }
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape;
    return Object.entries(shape).flatMap(([key, value]) => flattenZodSchema(value, prefix ? `${prefix}.${key}` : key));
  }
  if (schema instanceof z.ZodArray) {
    // Suggest accessing the first element for properties
    // @ts-ignore
    return flattenZodSchema(schema.element, `${prefix}[0]`);
  }
  return prefix ? [prefix] : [];
}
