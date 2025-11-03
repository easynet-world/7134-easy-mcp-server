const fs = require('fs');
const path = require('path');
const Logger = require('../../utils/logger');

const logger = Logger.default || new Logger();

/**
 * Generates n8n node TypeScript files from node definitions
 */
class N8nNodeGenerator {
  /**
   * Generate complete n8n node package
   * @param {Object} nodeDefinition - Node definition from N8nNodeBuilder
   * @param {Object} options - Generation options
   * @returns {Object} Generated files map
   */
  static generateNodePackage(nodeDefinition, options = {}) {
    const {
      outputDir = './n8n-nodes-output',
      nodeName = 'CustomAPI',
      author = '',
      version = '1.0.0',
      requiresAuth = false,
    } = options;

    const files = {};

    // Generate main node file
    const nodeFileName = `${nodeName}.node.ts`;
    files[nodeFileName] = this.generateNodeFile(nodeDefinition, options);

    // Generate credentials file if auth is required
    if (requiresAuth && nodeDefinition.credentials.length > 0) {
      const credentialsFileName = `${nodeName}.credentials.ts`;
      files[credentialsFileName] = this.generateCredentialsFile(nodeDefinition, options);
    }

    // Generate package.json
    files['package.json'] = this.generatePackageJson(nodeDefinition, options);

    // Generate tsconfig.json
    files['tsconfig.json'] = this.generateTsConfig();

    // Generate README
    files['README.md'] = this.generateReadme(nodeDefinition, options);

    // Generate .gitignore
    files['.gitignore'] = this.generateGitignore();

    // Generate gulpfile.js for icon handling
    files['gulpfile.js'] = this.generateGulpfile(nodeName);

    return files;
  }

  /**
   * Generate the main node TypeScript file
   * @param {Object} nodeDefinition - Node definition
   * @param {Object} options - Generation options
   * @returns {string} TypeScript code
   */
  static generateNodeFile(nodeDefinition, options = {}) {
    const templatePath = path.join(__dirname, '../templates/node.template.ts');
    let template = fs.readFileSync(templatePath, 'utf8');

    const {
      nodeName = 'CustomAPI',
      displayName = 'Custom API',
      description = 'Generated n8n node',
      icon = 'file:customapi.svg',
      baseUrl = 'http://localhost:3000',
    } = options;

    // Replace template placeholders
    const nodeClassName = this.toClassName(nodeName);
    template = template.replace(/{{NODE_CLASS_NAME}}/g, nodeClassName);
    template = template.replace(/{{NODE_NAME}}/g, this.toNodeName(nodeName));
    template = template.replace(/{{DISPLAY_NAME}}/g, displayName);
    template = template.replace(/{{DESCRIPTION}}/g, description);
    template = template.replace(/{{ICON}}/g, icon);
    template = template.replace(/{{BASE_URL}}/g, baseUrl);

    // Generate credentials array
    const credentialsArray = nodeDefinition.credentials && nodeDefinition.credentials.length > 0
      ? JSON.stringify(nodeDefinition.credentials, null, 2)
      : '[]';
    template = template.replace(/{{CREDENTIALS}}/g, credentialsArray);

    // Generate properties array with proper formatting
    const propertiesJson = JSON.stringify(nodeDefinition.properties, null, 2)
      .replace(/"(\w+)":/g, '$1:') // Remove quotes from property names
      .replace(/: "={{/g, ': \'={{') // Fix n8n expressions
      .replace(/}}"/g, '}}\',');

    template = template.replace(/{{PROPERTIES}}/g, propertiesJson);

    return template;
  }

  /**
   * Generate credentials TypeScript file
   * @param {Object} nodeDefinition - Node definition
   * @param {Object} options - Generation options
   * @returns {string} TypeScript code
   */
  static generateCredentialsFile(nodeDefinition, options = {}) {
    const templatePath = path.join(__dirname, '../templates/credentials.template.ts');
    let template = fs.readFileSync(templatePath, 'utf8');

    const {
      nodeName = 'CustomAPI',
      displayName = 'Custom API',
      baseUrl = 'http://localhost:3000',
      documentationUrl = '',
    } = options;

    const credentialsClassName = `${this.toClassName(nodeName)}Api`;
    const credentialsName = `${this.toNodeName(nodeName)}Api`;
    const credentialsDisplayName = `${displayName} API`;

    template = template.replace(/{{CREDENTIALS_CLASS_NAME}}/g, credentialsClassName);
    template = template.replace(/{{CREDENTIALS_NAME}}/g, credentialsName);
    template = template.replace(/{{CREDENTIALS_DISPLAY_NAME}}/g, credentialsDisplayName);
    template = template.replace(/{{BASE_URL}}/g, baseUrl);
    template = template.replace(/{{DOCUMENTATION_URL}}/g, documentationUrl);

    return template;
  }

  /**
   * Generate package.json
   * @param {Object} nodeDefinition - Node definition
   * @param {Object} options - Generation options
   * @returns {string} JSON string
   */
  static generatePackageJson(nodeDefinition, options = {}) {
    const {
      nodeName = 'CustomAPI',
      displayName = 'Custom API',
      description = 'Generated n8n node',
      version = '1.0.0',
      author = '',
      requiresAuth = false,
    } = options;

    const packageName = `n8n-nodes-${this.toNodeName(nodeName)}`;
    const nodeFileName = `dist/nodes/${nodeName}/${nodeName}.node.js`;

    const packageJson = {
      name: packageName,
      version,
      description,
      keywords: ['n8n-community-node-package'],
      license: 'MIT',
      homepage: '',
      author: {
        name: author,
        email: '',
      },
      repository: {
        type: 'git',
        url: '',
      },
      main: 'index.js',
      scripts: {
        build: 'tsc && gulp build:icons',
        dev: 'tsc --watch',
        format: 'prettier nodes --write',
        lint: 'eslint nodes package.json',
        lintfix: 'eslint nodes package.json --fix',
        prepublishOnly: 'npm run build && npm run lint -c .eslintrc.prepublish.js nodes package.json',
      },
      files: ['dist'],
      n8n: {
        n8nNodesApiVersion: 1,
        credentials: requiresAuth ? [`dist/credentials/${nodeName}.credentials.js`] : [],
        nodes: [nodeFileName],
      },
      devDependencies: {
        '@typescript-eslint/parser': '^5.0.0',
        eslint: '^8.0.0',
        'eslint-plugin-n8n-nodes-base': '^1.11.0',
        gulp: '^4.0.2',
        'n8n-workflow': '*',
        prettier: '^2.7.1',
        typescript: '^4.8.4',
      },
      peerDependencies: {
        'n8n-workflow': '*',
      },
    };

    return JSON.stringify(packageJson, null, 2);
  }

  /**
   * Generate tsconfig.json
   * @returns {string} JSON string
   */
  static generateTsConfig() {
    const templatePath = path.join(__dirname, '../templates/tsconfig.template.json');
    return fs.readFileSync(templatePath, 'utf8');
  }

  /**
   * Generate README.md
   * @param {Object} nodeDefinition - Node definition
   * @param {Object} options - Generation options
   * @returns {string} Markdown content
   */
  static generateReadme(nodeDefinition, options = {}) {
    const {
      nodeName = 'CustomAPI',
      displayName = 'Custom API',
      description = 'Generated n8n node',
      baseUrl = 'http://localhost:3000',
    } = options;

    const packageName = `n8n-nodes-${this.toNodeName(nodeName)}`;

    // Extract resources from operations
    const resources = Object.keys(nodeDefinition.operations || {});

    let resourcesSection = '';
    if (resources.length > 0) {
      resourcesSection = '\n## Resources\n\nThis node provides access to the following resources:\n\n';
      resources.forEach(resource => {
        const operations = nodeDefinition.operations[resource] || [];
        resourcesSection += `### ${resource.charAt(0).toUpperCase() + resource.slice(1)}\n\n`;
        operations.forEach(op => {
          resourcesSection += `- **${op.action}**: ${op.description}\n`;
        });
        resourcesSection += '\n';
      });
    }

    return `# ${packageName}

This is an n8n community node that lets you use ${displayName} in your n8n workflows.

${description}

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

## Operations
${resourcesSection}
## Credentials

This node connects to the API at: \`${baseUrl}\`

You may need to configure API credentials depending on your setup.

## Compatibility

This node was generated using easy-mcp-server and is compatible with n8n version 0.200.0 and above.

## Usage

Visit the [n8n documentation](https://docs.n8n.io/) for general usage information.

## Resources

* [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)
* [easy-mcp-server](https://github.com/easynet-world/easy-mcp-server)

## Version history

* 1.0.0 - Initial release

## License

[MIT](https://github.com/n8n-io/n8n/blob/master/LICENSE.md)
`;
  }

  /**
   * Generate .gitignore
   * @returns {string} .gitignore content
   */
  static generateGitignore() {
    return `node_modules/
dist/
*.log
.DS_Store
.env
.vscode/
.idea/
*.tsbuildinfo
`;
  }

  /**
   * Generate gulpfile.js for icon handling
   * @param {string} nodeName - Node name
   * @returns {string} Gulpfile content
   */
  static generateGulpfile(nodeName) {
    return `const { src, dest } = require('gulp');

async function buildIcons() {
  const nodeIconsDirectory = './nodes/${nodeName}/';
  return src(nodeIconsDirectory + '*.{png,svg}')
    .pipe(dest('./dist/nodes/${nodeName}'));
}

exports['build:icons'] = buildIcons;
exports.default = buildIcons;
`;
  }

  /**
   * Write generated files to disk
   * @param {Object} files - Map of filename to content
   * @param {string} outputDir - Output directory path
   */
  static writeFiles(files, outputDir) {
    // Create output directory structure
    const nodesDir = path.join(outputDir, 'nodes');
    const credentialsDir = path.join(outputDir, 'credentials');

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    if (!fs.existsSync(nodesDir)) {
      fs.mkdirSync(nodesDir, { recursive: true });
    }

    // Write each file
    Object.entries(files).forEach(([filename, content]) => {
      let filePath;

      if (filename.endsWith('.node.ts')) {
        filePath = path.join(nodesDir, filename);
      } else if (filename.endsWith('.credentials.ts')) {
        if (!fs.existsSync(credentialsDir)) {
          fs.mkdirSync(credentialsDir, { recursive: true });
        }
        filePath = path.join(credentialsDir, filename);
      } else {
        filePath = path.join(outputDir, filename);
      }

      fs.writeFileSync(filePath, content, 'utf8');
      logger.info(`Generated: ${filePath}`);
    });

    logger.info(`n8n node package generated successfully at: ${outputDir}`);
  }

  /**
   * Convert string to PascalCase class name
   * @param {string} str - Input string
   * @returns {string} PascalCase string
   */
  static toClassName(str) {
    return str
      .replace(/[^a-zA-Z0-9]/g, ' ')
      .split(' ')
      .filter(word => word.length > 0)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }

  /**
   * Convert string to kebab-case node name
   * @param {string} str - Input string
   * @returns {string} kebab-case string
   */
  static toNodeName(str) {
    return str
      .replace(/[^a-zA-Z0-9]/g, '-')
      .toLowerCase()
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
}

module.exports = N8nNodeGenerator;
