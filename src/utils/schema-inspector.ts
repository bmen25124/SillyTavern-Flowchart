import { z } from 'zod';

export function schemaToText(schema: z.ZodType, indent = 0): string {
  const indentation = '  '.repeat(indent);

  // 1. Handle concrete types first
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape;
    if (Object.keys(shape).length === 0) return '{}';
    const entries = Object.entries(shape)
      .map(([key, value]) => {
        // Check if the field is optional
        const isOptional =
          value instanceof z.ZodOptional || (typeof value.isOptional === 'function' && value.isOptional());
        const optionalMarker = isOptional ? '?' : '';
        const description = value.description ? ` // ${value.description}` : '';
        // Recursively call for the value, with increased indentation
        return `${indentation}  ${key}${optionalMarker}: ${schemaToText(value, indent + 1)}${description}`;
      })
      .join('\n');
    return `{\n${entries}\n${indentation}}`;
  }

  if (schema instanceof z.ZodArray) {
    const elementSchema = schema.element;
    // @ts-ignore
    const elementText = schemaToText(elementSchema, indent + 1);
    // Check if the inner type is complex (multiline)
    if (elementText.includes('\n')) {
      return `Array<\n${elementText}\n${indentation}>`;
    }
    // For simple types like Array<string>
    return `Array<${elementText.trim()}>`;
  }

  if (schema instanceof z.ZodString) return 'string';
  if (schema instanceof z.ZodNumber) return 'number';
  if (schema instanceof z.ZodBoolean) return 'boolean';
  if (schema instanceof z.ZodEnum) return 'enum';

  // 2. Handle wrapper types by recursively calling with the inner schema
  if (schema instanceof z.ZodOptional) {
    const innerSchema = schema._def.innerType as z.ZodType;
    return `${schemaToText(innerSchema, indent)}`;
  }

  if ('unwrap' in schema && typeof (schema as any).unwrap === 'function') {
    return schemaToText((schema as any).unwrap(), indent);
  }
  // This 'innerType' is more for Zod effects like transform/refine
  if ('innerType' in schema && typeof (schema as any).innerType === 'function') {
    return schemaToText((schema as any).innerType(), indent);
  }

  // 3. Fallback
  return 'any';
}

// Helper to generate a flat list of dot-notation paths from a Zod schema.
export function flattenZodSchema(schema: z.ZodType, prefix = ''): string[] {
  // Check for wrapper types first
  if ('unwrap' in schema && typeof schema.unwrap === 'function') {
    // @ts-ignore
    return flattenZodSchema(schema.unwrap(), prefix);
  }
  if ('innerType' in schema && typeof schema.innerType === 'function') {
    // @ts-ignore
    return flattenZodSchema(schema.innerType(), prefix);
  }

  // Check for concrete types
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
