/**
 * Skills Dictionary - Comprehensive list of technical skills
 * Organized by categories for easy maintenance and extension
 */

const SKILLS_DICTIONARY = {
  // Programming Languages
  programming: [
    'javascript', 'js', 'typescript', 'ts', 'python', 'java', 'c++', 'c#', 'csharp',
    'php', 'ruby', 'go', 'golang', 'rust', 'swift', 'kotlin', 'scala', 'r',
    'matlab', 'perl', 'shell', 'bash', 'powershell', 'objective-c', 'dart',
    'elixir', 'erlang', 'haskell', 'clojure', 'f#', 'visual basic', 'vb.net',
    'assembly', 'cobol', 'fortran', 'lua', 'groovy', 'solidity'
  ],

  // Web Frontend Technologies
  frontend: [
    'react', 'react.js', 'reactjs', 'angular', 'angularjs', 'vue', 'vue.js', 'vuejs',
    'svelte', 'ember', 'ember.js', 'next.js', 'nextjs', 'nuxt', 'nuxt.js', 'gatsby',
    'html', 'html5', 'css', 'css3', 'sass', 'scss', 'less', 'stylus',
    'bootstrap', 'tailwind', 'tailwind css', 'material ui', 'mui', 'chakra ui',
    'styled components', 'emotion', 'jquery', 'backbone.js', 'knockout.js',
    'webpack', 'vite', 'parcel', 'rollup', 'gulp', 'grunt', 'babel'
  ],

  // Backend Technologies
  backend: [
    'node.js', 'nodejs', 'express', 'express.js', 'koa', 'fastify', 'nest.js', 'nestjs',
    'django', 'flask', 'fastapi', 'spring', 'spring boot', 'springboot',
    'asp.net', 'asp.net core', '.net', 'dotnet', 'laravel', 'symfony', 'codeigniter',
    'ruby on rails', 'rails', 'sinatra', 'phoenix', 'gin', 'echo', 'fiber',
    'actix', 'rocket', 'vapor', 'perfect', 'kitura', 'play framework'
  ],

  // Databases
  databases: [
    'mysql', 'postgresql', 'postgres', 'sqlite', 'oracle', 'sql server', 'mssql',
    'mongodb', 'mongoose', 'redis', 'elasticsearch', 'cassandra', 'dynamodb',
    'firestore', 'firebase', 'supabase', 'planetscale', 'cockroachdb',
    'neo4j', 'arangodb', 'couchdb', 'rethinkdb', 'influxdb', 'timescaledb',
    'mariadb', 'aurora', 'snowflake', 'bigquery', 'redshift', 'databricks'
  ],

  // Cloud Platforms & Services
  cloud: [
    'aws', 'amazon web services', 'azure', 'microsoft azure', 'google cloud', 'gcp',
    'google cloud platform', 'heroku', 'vercel', 'netlify', 'digitalocean',
    'linode', 'vultr', 'cloudflare', 'fastly', 'cdn', 'content delivery network',
    'lambda', 'azure functions', 'google functions', 'cloud functions',
    's3', 'blob storage', 'cloud storage', 'ec2', 'compute engine', 'app service',
    'elastic beanstalk', 'cloud run', 'fargate', 'ecs', 'aks', 'eks', 'gke'
  ],

  // DevOps & Tools
  devops: [
    'docker', 'kubernetes', 'k8s', 'helm', 'jenkins', 'gitlab ci', 'github actions',
    'circle ci', 'travis ci', 'azure devops', 'terraform', 'ansible', 'chef',
    'puppet', 'vagrant', 'packer', 'consul', 'vault', 'nomad', 'prometheus',
    'grafana', 'elk stack', 'elasticsearch', 'logstash', 'kibana', 'datadog',
    'new relic', 'splunk', 'nginx', 'apache', 'haproxy', 'istio', 'envoy'
  ],

  // Version Control
  versionControl: [
    'git', 'github', 'gitlab', 'bitbucket', 'svn', 'mercurial', 'perforce',
    'source control', 'version control', 'git flow', 'github flow'
  ],

  // Mobile Development
  mobile: [
    'ios development', 'android development', 'react native', 'flutter', 'xamarin',
    'ionic', 'cordova', 'phonegap', 'swift ui', 'jetpack compose', 'kotlin multiplatform',
    'unity', 'unreal engine', 'xcode', 'android studio', 'app store', 'play store'
  ],

  // Data Science & AI/ML
  datascience: [
    'machine learning', 'ml', 'deep learning', 'artificial intelligence', 'ai',
    'data science', 'data analysis', 'data analytics', 'big data', 'pandas',
    'numpy', 'scipy', 'matplotlib', 'seaborn', 'plotly', 'scikit-learn', 'sklearn',
    'tensorflow', 'keras', 'pytorch', 'opencv', 'nlp', 'natural language processing',
    'computer vision', 'neural networks', 'regression', 'classification', 'clustering',
    'jupyter', 'google colab', 'anaconda', 'conda', 'spark', 'hadoop', 'kafka',
    'airflow', 'dbt', 'tableau', 'power bi', 'looker', 'qlik', 'r studio'
  ],

  // Testing
  testing: [
    'unit testing', 'integration testing', 'e2e testing', 'test automation',
    'jest', 'mocha', 'chai', 'jasmine', 'karma', 'cypress', 'selenium',
    'playwright', 'puppeteer', 'webdriver', 'junit', 'testng', 'pytest',
    'rspec', 'minitest', 'go test', 'postman', 'insomnia', 'newman',
    'cucumber', 'behave', 'specflow', 'tdd', 'bdd', 'quality assurance', 'qa'
  ],

  // Security
  security: [
    'cybersecurity', 'information security', 'penetration testing', 'ethical hacking',
    'vulnerability assessment', 'security audit', 'owasp', 'ssl', 'tls', 'https',
    'encryption', 'authentication', 'authorization', 'oauth', 'jwt', 'saml',
    'ldap', 'active directory', 'kerberos', 'pki', 'firewall', 'intrusion detection',
    'siem', 'incident response', 'forensics', 'malware analysis', 'reverse engineering'
  ],

  // Project Management & Methodologies
  management: [
    'agile', 'scrum', 'kanban', 'waterfall', 'lean', 'six sigma', 'prince2',
    'pmp', 'project management', 'product management', 'product owner', 'scrum master',
    'team leadership', 'stakeholder management', 'risk management', 'budget management',
    'jira', 'confluence', 'trello', 'asana', 'monday.com', 'notion', 'slack',
    'microsoft teams', 'zoom', 'miro', 'figma', 'sketch', 'adobe xd'
  ],

  // Design & UX
  design: [
    'ui design', 'ux design', 'user interface', 'user experience', 'interaction design',
    'visual design', 'graphic design', 'web design', 'mobile design', 'responsive design',
    'wireframing', 'prototyping', 'user research', 'usability testing', 'accessibility',
    'figma', 'sketch', 'adobe xd', 'invision', 'zeplin', 'principle', 'framer',
    'adobe photoshop', 'adobe illustrator', 'adobe after effects', 'canva'
  ],

  // Soft Skills
  soft: [
    'communication', 'teamwork', 'leadership', 'problem solving', 'critical thinking',
    'creativity', 'adaptability', 'time management', 'organization', 'attention to detail',
    'collaboration', 'mentoring', 'coaching', 'public speaking', 'presentation skills',
    'negotiation', 'conflict resolution', 'emotional intelligence', 'customer service',
    'sales', 'marketing', 'business analysis', 'strategic thinking', 'innovation'
  ]
};

/**
 * Skill aliases and variations mapping
 * Maps alternative terms to standardized skill names
 */
const SKILL_ALIASES = {
  // Programming language aliases
  'js': 'javascript',
  'ts': 'typescript',
  'py': 'python',
  'golang': 'go',
  'c sharp': 'c#',
  'csharp': 'c#',
  'c plus plus': 'c++',
  'cplusplus': 'c++',
  'objective c': 'objective-c',
  'objc': 'objective-c',

  // Framework aliases
  'reactjs': 'react',
  'react.js': 'react',
  'vuejs': 'vue.js',
  'angularjs': 'angular',
  'nodejs': 'node.js',
  'expressjs': 'express',
  'nextjs': 'next.js',
  'nuxtjs': 'nuxt.js',

  // Database aliases
  'postgres': 'postgresql',
  'mongo': 'mongodb',
  'mssql': 'sql server',
  'mysql': 'mysql',

  // Cloud aliases
  'amazon web services': 'aws',
  'microsoft azure': 'azure',
  'google cloud platform': 'google cloud',
  'gcp': 'google cloud',

  // Other aliases
  'k8s': 'kubernetes',
  'ml': 'machine learning',
  'ai': 'artificial intelligence',
  'nlp': 'natural language processing',
  'cv': 'computer vision',
  'ui/ux': 'ui ux design',
  'frontend': 'front-end development',
  'backend': 'back-end development',
  'fullstack': 'full-stack development',
  'full stack': 'full-stack development',
  'devops': 'devops',
  'cicd': 'ci/cd',
  'ci cd': 'ci/cd'
};

/**
 * Get all skills as a flat array
 * @returns {Array<string>} - Flat array of all skills
 */
function getAllSkills() {
  const allSkills = [];
  Object.values(SKILLS_DICTIONARY).forEach(category => {
    allSkills.push(...category);
  });
  return [...new Set(allSkills)]; // Remove duplicates
}

/**
 * Get skills by category
 * @param {string} category - Category name
 * @returns {Array<string>} - Skills in the specified category
 */
function getSkillsByCategory(category) {
  return SKILLS_DICTIONARY[category] || [];
}

/**
 * Add new skills to a category
 * @param {string} category - Category name
 * @param {Array<string>} skills - Skills to add
 */
function addSkillsToCategory(category, skills) {
  if (!SKILLS_DICTIONARY[category]) {
    SKILLS_DICTIONARY[category] = [];
  }
  SKILLS_DICTIONARY[category].push(...skills);
  // Remove duplicates
  SKILLS_DICTIONARY[category] = [...new Set(SKILLS_DICTIONARY[category])];
}

/**
 * Add new skill alias
 * @param {string} alias - Alias term
 * @param {string} canonical - Canonical skill name
 */
function addSkillAlias(alias, canonical) {
  SKILL_ALIASES[alias.toLowerCase()] = canonical.toLowerCase();
}

module.exports = {
  SKILLS_DICTIONARY,
  SKILL_ALIASES,
  getAllSkills,
  getSkillsByCategory,
  addSkillsToCategory,
  addSkillAlias
};