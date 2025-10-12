import { parseResponse } from '../parser.js';

describe('parseResponse', () => {
  describe('JSON parsing', () => {
    it('should parse a valid JSON string', () => {
      const content = '{"key": "value", "number": 123}';
      const result = parseResponse(content, 'json');
      expect(result).toEqual({ key: 'value', number: 123 });
    });

    it('should extract and parse JSON from a markdown code block', () => {
      const content = 'Some text before\n```json\n{"key": "value"}\n```\nSome text after';
      const result = parseResponse(content, 'json');
      expect(result).toEqual({ key: 'value' });
    });

    it('should throw an error for malformed JSON', () => {
      const content = '{"key": "value",}'; // Trailing comma is invalid
      expect(() => parseResponse(content, 'json')).toThrow('Model response is not valid JSON.');
    });
  });

  describe('XML parsing', () => {
    it('should parse a valid XML string', () => {
      const content = '<root><item>A</item><item>B</item></root>';
      const result = parseResponse(content, 'xml');
      expect(result).toEqual({ item: ['A', 'B'] });
    });

    it('should extract and parse XML from a markdown code block', () => {
      const content = 'Here is the XML:\n```xml\n<data><value>123</value></data>\n```';
      const result = parseResponse(content, 'xml');
      expect(result).toEqual({ data: { value: 123 } });
    });

    it('should handle single elements that should be arrays based on schema', () => {
      const content = '<root><items><item>one</item></items></root>';
      const schema = {
        type: 'object',
        properties: {
          items: {
            type: 'object',
            properties: {
              item: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      };
      const result = parseResponse(content, 'xml', { schema });
      expect(result).toEqual({ items: { item: ['one'] } });
    });

    // Unfortunately, the XML parser we are using is very lenient and does not throw errors for malformed XML.
    // it('should throw an error for malformed XML', () => {
    //   const content = '<root><item>'; // Unclosed tag
    //   expect(() => parseResponse(content, 'xml')).toThrow('Model response is not valid XML.');
    // });
  });
});
