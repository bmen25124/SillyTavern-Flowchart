import { XMLParser, XMLValidator } from 'fast-xml-parser';

const xmlParser = new XMLParser({
  ignoreAttributes: true,
  textNodeName: '#text',
  trimValues: true,
  allowBooleanAttributes: true,
});

export interface XmlParseOptions {
  schema?: any;
}

function ensureArray(data: any, schema: any) {
  if (!schema || !data) {
    return;
  }

  for (const key in schema.properties) {
    if (schema.properties[key].type === 'array' && data[key] && !Array.isArray(data[key])) {
      data[key] = [data[key]];
    }
    if (schema.properties[key].type === 'object') {
      ensureArray(data[key], schema.properties[key]);
    }
    if (schema.properties[key].type === 'array' && schema.properties[key].items.type === 'object') {
      if (Array.isArray(data[key])) {
        data[key].forEach((item: any) => ensureArray(item, schema.properties[key].items));
      } else {
        ensureArray(data[key], schema.properties[key].items);
      }
    }
  }
}

export function parseResponse(content: string, format: 'xml' | 'json', options: XmlParseOptions = {}): object {
  // Extract content from inside code blocks, handling language identifiers
  const codeBlockRegex = /```(?:\w+\n|\n)([\s\S]*?)```/;
  const codeBlockMatch = content.match(codeBlockRegex);
  let cleanedContent = codeBlockMatch ? codeBlockMatch[1].trim() : content.trim();

  try {
    switch (format) {
      case 'xml':
        const validationResult = XMLValidator.validate(cleanedContent);
        if (validationResult !== true) {
          throw new Error(`Model response is not valid XML: ${validationResult.err.msg}`);
        }
        let parsedXml = xmlParser.parse(cleanedContent);
        if (parsedXml.root) {
          parsedXml = parsedXml.root;
        }
        if (options.schema) {
          ensureArray(parsedXml, options.schema);
        }
        return parsedXml;

      case 'json':
        const parsedJson = JSON.parse(cleanedContent);
        return parsedJson;

      default:
        throw new Error(`Unsupported format specified: ${format}`);
    }
  } catch (error: any) {
    if (format === 'xml') {
      // Re-throw with a consistent error message if it's not our custom one
      if (error.message.startsWith('Model response is not valid XML:')) {
        throw error;
      }
      throw new Error('Model response is not valid XML.');
    }
    if (format === 'json') {
      throw new Error('Model response is not valid JSON.');
    }
    // Fallback for other potential errors (e.g., unsupported format)
    throw new Error(`Failed to parse response as ${format}: ${error.message}`);
  }
}
