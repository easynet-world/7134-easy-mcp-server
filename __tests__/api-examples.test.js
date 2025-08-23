describe('API Examples', () => {
  test('GetExample class should have process method', () => {
    const GetExample = require('../api/example/get');
    const instance = new GetExample();
    
    expect(typeof instance.process).toBe('function');
    expect(instance.process).toBeDefined();
  });
  
  test('PostExample class should have process method', () => {
    const PostExample = require('../api/example/post');
    const instance = new PostExample();
    
    expect(typeof instance.process).toBe('function');
    expect(instance.process).toBeDefined();
  });
  
  test('PutExample class should have process method', () => {
    const PutExample = require('../api/example/put');
    const instance = new PutExample();
    
    expect(typeof instance.process).toBe('function');
    expect(instance.process).toBeDefined();
  });
  
  test('PatchExample class should have process method', () => {
    const PatchExample = require('../api/example/patch');
    const instance = new PatchExample();
    
    expect(typeof instance.process).toBe('function');
    expect(instance.process).toBeDefined();
  });
  
  test('DeleteExample class should have process method', () => {
    const DeleteExample = require('../api/example/delete');
    const instance = new DeleteExample();
    
    expect(typeof instance.process).toBe('function');
    expect(instance.process).toBeDefined();
  });
  
  test('All examples should have description getter', () => {
    const examples = [
      require('../api/example/get'),
      require('../api/example/post'),
      require('../api/example/put'),
      require('../api/example/patch'),
      require('../api/example/delete')
    ];
    
    examples.forEach(ExampleClass => {
      const instance = new ExampleClass();
      expect(instance.description).toBeDefined();
      expect(typeof instance.description).toBe('string');
      expect(instance.description.length).toBeGreaterThan(0);
    });
  });
});
