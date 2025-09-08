/**
 * Tests for SimpleParameterParser - Format-agnostic parameter extraction
 */

const SimpleParameterParser = require('../src/utils/parameter-template-parser');

describe('SimpleParameterParser', () => {
  describe('extractParameters', () => {
    it('should extract parameters from any text content', () => {
      const content = 'Hello {{name}}, your query is {{query}} and status is {{status}}.';
      const parameters = SimpleParameterParser.extractParameters(content);
      
      expect(parameters).toEqual(['name', 'query', 'status']);
    });

    it('should handle duplicate parameters', () => {
      const content = '{{name}} and {{name}} again with {{query}}.';
      const parameters = SimpleParameterParser.extractParameters(content);
      
      expect(parameters).toEqual(['name', 'query']);
    });

    it('should return empty array for no parameters', () => {
      const content = 'This is plain text with no parameters.';
      const parameters = SimpleParameterParser.extractParameters(content);
      
      expect(parameters).toEqual([]);
    });
  });

  describe('parse', () => {
    it('should parse Markdown content', () => {
      const content = '# Title\n\nHello {{name}}!';
      const result = SimpleParameterParser.parse(content, 'test.md');
      
      expect(result.name).toBe('test');
      expect(result.extension).toBe('.md');
      expect(result.format).toBe('markdown');
      expect(result.parameters).toEqual(['name']);
      expect(result.hasParameters).toBe(true);
    });

    it('should parse JavaScript content', () => {
      const content = 'function {{func_name}}({{params}}) { return {{result}}; }';
      const result = SimpleParameterParser.parse(content, 'script.js');
      
      expect(result.name).toBe('script');
      expect(result.extension).toBe('.js');
      expect(result.format).toBe('javascript');
      expect(result.parameters).toEqual(['func_name', 'params', 'result']);
    });

    it('should parse YAML content', () => {
      const content = 'name: {{app_name}}\nversion: {{version}}';
      const result = SimpleParameterParser.parse(content, 'config.yaml');
      
      expect(result.name).toBe('config');
      expect(result.extension).toBe('.yaml');
      expect(result.format).toBe('yaml');
      expect(result.parameters).toEqual(['app_name', 'version']);
    });

    it('should parse text content', () => {
      const content = 'Plain text with {{param1}} and {{param2}}.';
      const result = SimpleParameterParser.parse(content, 'readme.txt');
      
      expect(result.name).toBe('readme');
      expect(result.extension).toBe('.txt');
      expect(result.format).toBe('text');
      expect(result.parameters).toEqual(['param1', 'param2']);
    });

    it('should handle unknown file extensions', () => {
      const content = 'Content with {{param}}.';
      const result = SimpleParameterParser.parse(content, 'file.xyz');
      
      expect(result.name).toBe('file');
      expect(result.extension).toBe('.xyz');
      expect(result.format).toBe('text');
      expect(result.parameters).toEqual(['param']);
    });

    it('should remove HTML comments', () => {
      const content = '<!-- This is a comment -->\nContent with {{param}}.\n<!-- Another comment -->';
      const result = SimpleParameterParser.parse(content, 'test.md');
      
      expect(result.content).not.toContain('<!--');
      expect(result.content).toContain('Content with {{param}}');
    });
  });

  describe('getFormatType', () => {
    it('should return correct format types', () => {
      expect(SimpleParameterParser.getFormatType('.md')).toBe('markdown');
      expect(SimpleParameterParser.getFormatType('.js')).toBe('javascript');
      expect(SimpleParameterParser.getFormatType('.yaml')).toBe('yaml');
      expect(SimpleParameterParser.getFormatType('.txt')).toBe('text');
      expect(SimpleParameterParser.getFormatType('.py')).toBe('python');
      expect(SimpleParameterParser.getFormatType('.html')).toBe('html');
      expect(SimpleParameterParser.getFormatType('.unknown')).toBe('text');
    });
  });

  describe('hasParameters', () => {
    it('should detect files with parameters', () => {
      expect(SimpleParameterParser.hasParameters('Hello {{name}}')).toBe(true);
      expect(SimpleParameterParser.hasParameters('{{param1}} and {{param2}}')).toBe(true);
    });

    it('should detect files without parameters', () => {
      expect(SimpleParameterParser.hasParameters('Plain text')).toBe(false);
      expect(SimpleParameterParser.hasParameters('No {{ parameters here')).toBe(false);
    });
  });

  describe('getSupportedExtensions', () => {
    it('should return array of supported extensions', () => {
      const extensions = SimpleParameterParser.getSupportedExtensions();
      
      expect(Array.isArray(extensions)).toBe(true);
      expect(extensions).toContain('.md');
      expect(extensions).toContain('.js');
      expect(extensions).toContain('.yaml');
      expect(extensions).toContain('.txt');
      expect(extensions).toContain('.py');
    });
  });
});
