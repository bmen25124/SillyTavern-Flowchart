function jsonToXml(json: any, indent = 0): string {
  let xml = '';
  const indentation = '  '.repeat(indent);
  for (const key in json) {
    if (json.hasOwnProperty(key)) {
      const value = json[key];
      if (Array.isArray(value)) {
        value.forEach((item) => {
          if (typeof item === 'object' && item !== null) {
            xml += `${indentation}<${key}>\n`;
            xml += jsonToXml(item, indent + 1);
            xml += `${indentation}</${key}>\n`;
          } else {
            xml += `${indentation}<${key}>${item}</${key}>\n`;
          }
        });
      } else if (typeof value === 'object' && value !== null) {
        xml += `${indentation}<${key}>\n`;
        xml += jsonToXml(value, indent + 1);
        xml += `${indentation}</${key}>\n`;
      } else {
        xml += `${indentation}<${key}>${value}</${key}>\n`;
      }
    }
  }
  return xml;
}

export function schemaToExample(schema: any, format: 'json' | 'xml'): string {
  const example = generateExample(schema);
  if (format === 'xml') {
    return jsonToXml(example).trim();
  }
  return JSON.stringify(example, null, 2);
}

function generateExample(schema: any): any {
  if (schema.example) {
    return schema.example;
  }

  switch (schema.type) {
    case 'object':
      const obj: { [key: string]: any } = {};
      if (schema.properties) {
        for (const key in schema.properties) {
          obj[key] = generateExample(schema.properties[key]);
        }
      }
      return obj;
    case 'array':
      if (schema.items) {
        return [generateExample(schema.items)];
      }
      return [];
    case 'string':
      return schema.description || 'string';
    case 'number':
      return 0;
    case 'boolean':
      return false;
    default:
      return null;
  }
}
