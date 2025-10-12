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
