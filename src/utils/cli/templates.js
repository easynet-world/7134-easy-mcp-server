/**
 * Template Loading Module
 * Handles loading and processing template files from the templates directory
 */

const fs = require('fs');
const path = require('path');

/**
 * Get the template directory path
 * Tries multiple locations to support both development and npm package installations
 * @returns {string} Path to templates directory
 */
function getTemplateDir() {
  // Try to find templates relative to package root (when installed as npm package)
  const possiblePaths = [
    path.join(__dirname, '..', '..', '..', 'templates'), // From src/utils/cli/ directory
    path.join(__dirname, '..', '..', 'templates'), // From src/utils/ directory
    path.join(__dirname, '..', '..', '..', '..', 'templates'), // From node_modules/easy-mcp-server/src/utils/cli
    path.resolve(process.cwd(), 'node_modules', 'easy-mcp-server', 'templates'), // When installed
    path.resolve(process.cwd(), 'templates') // Fallback to local templates
  ];
  
  for (const templatePath of possiblePaths) {
    if (fs.existsSync(templatePath) && fs.existsSync(path.join(templatePath, 'scripts'))) {
      return templatePath;
    }
  }
  
  // If no templates found, return relative to project root (for development)
  return path.join(__dirname, '..', '..', '..', 'templates');
}

/**
 * Read a template file and replace placeholders
 * @param {string} templateFile - Relative path to template file (e.g., 'scripts/start.sh')
 * @param {Object} replacements - Key-value pairs for placeholder replacement (e.g., { PROJECT_NAME: 'my-project' })
 * @returns {string} Template content with placeholders replaced
 * @throws {Error} If template file is not found
 */
function readTemplate(templateFile, replacements = {}) {
  const templateDir = getTemplateDir();
  const templatePath = path.join(templateDir, templateFile);
  
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template file not found: ${templatePath}`);
  }
  
  let content = fs.readFileSync(templatePath, 'utf8');
  
  // Replace placeholders (e.g., {{PROJECT_NAME}})
  for (const [key, value] of Object.entries(replacements)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    content = content.replace(regex, value);
  }
  
  return content;
}

module.exports = {
  getTemplateDir,
  readTemplate
};

