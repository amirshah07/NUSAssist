import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../frontend/.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing required environment variables!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Configuration constants
const CONFIG = {
  MODULE_CODE_PATTERN: /\b[A-Z]{2,4}\d{4}[A-Z]{0,2}\b/g,
  TABLE_NAME: 'available_mods',
};

// Modules to ignore in prerequisites
const MODULES_TO_IGNORE = ['MA1301', 'MA1301X', 'MA1301FC','LSM1301', 'ES1000', 'CM1417', 'CM1417X']; 

enum TokenType {
  MODULE_CODE = 'MODULE_CODE',
  SLASH = 'SLASH',
  NUMBER = 'NUMBER',
  LPAREN = 'LPAREN',
  RPAREN = 'RPAREN',
  AND = 'AND',
  OR = 'OR',
  MUST_HAVE_COMPLETED = 'MUST_HAVE_COMPLETED',
  ALL_OF = 'ALL_OF',
  OF = 'OF',
  ANY_COURSES_BEGINNING_WITH = 'ANY_COURSES_BEGINNING_WITH',
  PREFIX = 'PREFIX',
  COMMA = 'COMMA',
  TEXT = 'TEXT',
  EOF = 'EOF'
}

interface Token {
  type: TokenType;
  value: string;
  position: number;
}

interface ModuleData {
  moduleCode: string;
  prerequisite?: string;
}

interface ExtractionResult {
  hardPrerequisites: any;
}

class PrerequisiteTokenizer {
  private text: string;
  private position: number = 0;
  private tokens: Token[] = [];

  constructor(text: string) {
    this.text = text;
  }

  tokenize(): Token[] {
    while (this.position < this.text.length) {
      this.skipWhitespace();
      
      if (this.position >= this.text.length) break;

      const token = this.readToken();
      if (token) {
        this.tokens.push(token);
      }
    }

    this.tokens.push({ type: TokenType.EOF, value: '', position: this.position });
    return this.tokens;
  }

  private skipWhitespace(): void {
    while (this.position < this.text.length && /\s/.test(this.text[this.position])) {
      this.position++;
    }
  }

  private readToken(): Token | null {
    const start = this.position;
    
    // Check for parentheses
    if (this.text[this.position] === '(') {
      this.position++;
      return { type: TokenType.LPAREN, value: '(', position: start };
    }
    
    if (this.text[this.position] === ')') {
      this.position++;
      return { type: TokenType.RPAREN, value: ')', position: start };
    }
    
    // Check for slash
    if (this.text[this.position] === '/') {
      this.position++;
      return { type: TokenType.SLASH, value: '/', position: start };
    }
    
    // Check for comma
    if (this.text[this.position] === ',') {
      this.position++;
      return { type: TokenType.COMMA, value: ',', position: start };
    }
    
    // Check for keywords and module codes
    let word = '';
    const wordStart = this.position;
    
    // Read until we hit a delimiter
    while (this.position < this.text.length && 
           !/[\s(),/]/.test(this.text[this.position])) {
      word += this.text[this.position];
      this.position++;
    }
    
    if (word) {
      // Check if it's a module code
      if (/^[A-Z]{2,4}\d{4}[A-Z]{0,2}$/.test(word)) {
        return { type: TokenType.MODULE_CODE, value: word, position: wordStart };
      }
      
      // Check if it's a number
      if (/^\d+$/.test(word)) {
        return { type: TokenType.NUMBER, value: word, position: wordStart };
      }
      
      // Check for keywords (case insensitive)
      const upperWord = word.toUpperCase();
      
      if (upperWord === 'AND') {
        return { type: TokenType.AND, value: word, position: wordStart };
      }
      
      if (upperWord === 'OR') {
        return { type: TokenType.OR, value: word, position: wordStart };
      }
      
      if (upperWord === 'OF') {
        return { type: TokenType.OF, value: word, position: wordStart };
      }
      
      // Check for multi-word phrases
      const remainingText = this.text.substring(wordStart).toLowerCase();
      
      if (remainingText.startsWith('must have completed all of')) {
        this.position = wordStart + 'must have completed all of'.length;
        return { type: TokenType.ALL_OF, value: 'all of', position: wordStart };
      }
      
      if (remainingText.startsWith('must have completed')) {
        this.position = wordStart + 'must have completed'.length;
        return { type: TokenType.MUST_HAVE_COMPLETED, value: 'must have completed', position: wordStart };
      }
      
      if (remainingText.startsWith('any courses beginning with')) {
        this.position = wordStart + 'any courses beginning with'.length;
        this.skipWhitespace();
        // Read the prefix
        const prefixStart = this.position;
        let prefix = '';
        while (this.position < this.text.length && /[A-Z]/.test(this.text[this.position])) {
          prefix += this.text[this.position];
          this.position++;
        }
        return { type: TokenType.ANY_COURSES_BEGINNING_WITH, value: prefix, position: wordStart };
      }
      
      // Otherwise it's just text
      return { type: TokenType.TEXT, value: word, position: wordStart };
    }
    
    return null;
  }
}

class PrerequisiteParser {
  private tokens: Token[];
  private position: number = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parse(): any {
    const result = this.parseExpression();
    const simplified = this.simplifyStructure(result);
    return this.filterIgnoredModules(simplified);
  }

  private currentToken(): Token {
    return this.tokens[this.position] || { type: TokenType.EOF, value: '', position: -1 };
  }

  private consume(type: TokenType): Token | null {
    const token = this.currentToken();
    if (token.type === type) {
      this.position++;
      return token;
    }
    return null;
  }

  private peek(type: TokenType): boolean {
    return this.currentToken().type === type;
  }

  private parseExpression(): any {
    return this.parseOrExpression();
  }

  private parseOrExpression(): any {
    let left = this.parseAndExpression();
    
    while (this.peek(TokenType.OR)) {
      this.consume(TokenType.OR);
      const right = this.parseAndExpression();
      
      if (left && right) {
        // Merge OR expressions
        if (left.type === 'or') {
          left.requirements.push(right);
        } else {
          left = {
            type: 'or',
            requirements: [left, right]
          };
        }
      } else if (right) {
        left = right;
      }
    }
    
    return left;
  }

  private parseAndExpression(): any {
    let requirements: any[] = [];
    
    // Parse first requirement
    const first = this.parsePrimaryExpression();
    if (first) requirements.push(first);
    
    // Parse additional AND requirements
    while (this.peek(TokenType.AND)) {
      this.consume(TokenType.AND);
      const next = this.parsePrimaryExpression();
      if (next) requirements.push(next);
    }
    
    if (requirements.length === 0) return null;
    if (requirements.length === 1) return requirements[0];
    
    const flattened: any[] = [];
    for (const req of requirements) {
      if (Array.isArray(req) && req.every(item => typeof item === 'string')) {
        flattened.push(...req);
      } else {
        flattened.push(req);
      }
    }
    
    return flattened;
  }

  private parsePrimaryExpression(): any {
    // Handle parentheses
    if (this.peek(TokenType.LPAREN)) {
      this.consume(TokenType.LPAREN);
      const expr = this.parseExpression();
      this.consume(TokenType.RPAREN);
      return expr;
    }
    
    // Handle "must have completed all of"
    if (this.peek(TokenType.ALL_OF)) {
      this.consume(TokenType.ALL_OF);
      const modules = this.parseModuleList();
      
      // "all of X/Y/Z" means each module is required
      if (modules.length === 1 && modules[0].includes('/')) {
        return modules[0].split('/').map((m: string) => m.trim());
      }
      return modules;
    }
    
    // Handle "must have completed X of Y"
    if (this.peek(TokenType.MUST_HAVE_COMPLETED)) {
      this.consume(TokenType.MUST_HAVE_COMPLETED);
      
      // Check if there's a number
      let count = 1;
      if (this.peek(TokenType.NUMBER)) {
        count = parseInt(this.consume(TokenType.NUMBER)!.value);
        this.consume(TokenType.OF); // consume "of"
      }
      
      // Parse the module list or special patterns
      const options = this.parseOptionsWithPatterns();
      
      if (options.length === 0) return null;
      
      // If it's "1 of" a single slash-separated group
      if (count === 1 && options.length === 1 && 
          typeof options[0] === 'string' && options[0].includes('/')) {
        return options[0];
      }
      
      // For multiple options or count > 1
      if (count > 1 || options.length > 1 || options.some(opt => typeof opt === 'object')) {
        return {
          type: 'minimum',
          count: count,
          options: options
        };
      }
      
      return options[0];
    }
    
    // Handle "any courses beginning with"
    if (this.peek(TokenType.ANY_COURSES_BEGINNING_WITH)) {
      const token = this.consume(TokenType.ANY_COURSES_BEGINNING_WITH)!;
      return {
        type: 'prefix',
        prefix: token.value
      };
    }
    
    // Handle direct module codes
    const modules = this.parseModuleList();
    if (modules.length > 0) {
      if (modules.length === 1 && modules[0].includes('/')) {
        return modules[0];
      }
      return modules;
    }
    
    // Skip unrecognized text
    while (this.currentToken().type === TokenType.TEXT) {
      this.position++;
    }
    
    return null;
  }

  private parseModuleList(): string[] {
    const modules: string[] = [];
    
    // Parse slash-separated modules
    if (this.peek(TokenType.MODULE_CODE)) {
      let moduleGroup = this.consume(TokenType.MODULE_CODE)!.value;
      
      // Check for slash-separated alternatives
      while (this.peek(TokenType.SLASH)) {
        this.consume(TokenType.SLASH);
        if (this.peek(TokenType.MODULE_CODE)) {
          moduleGroup += '/' + this.consume(TokenType.MODULE_CODE)!.value;
        }
      }
      
      modules.push(moduleGroup);
      
      // Check for comma-separated additional modules
      while (this.peek(TokenType.COMMA)) {
        this.consume(TokenType.COMMA);
        if (this.peek(TokenType.MODULE_CODE)) {
          let nextGroup = this.consume(TokenType.MODULE_CODE)!.value;
          
          // Check for slash-separated alternatives
          while (this.peek(TokenType.SLASH)) {
            this.consume(TokenType.SLASH);
            if (this.peek(TokenType.MODULE_CODE)) {
              nextGroup += '/' + this.consume(TokenType.MODULE_CODE)!.value;
            }
          }
          
          modules.push(nextGroup);
        }
      }
    }
    
    return modules;
  }

  private parseOptionsWithPatterns(): any[] {
    const options: any[] = [];
    
    // First, try to parse module codes
    const modules = this.parseModuleList();
    options.push(...modules);
    
    // Then check for patterns mixed with commas
    while (this.peek(TokenType.COMMA)) {
      this.consume(TokenType.COMMA);
      
      if (this.peek(TokenType.ANY_COURSES_BEGINNING_WITH)) {
        const token = this.consume(TokenType.ANY_COURSES_BEGINNING_WITH)!;
        options.push({
          type: 'prefix',
          prefix: token.value
        });
      } else {
        // Try to parse more modules
        const moreModules = this.parseModuleList();
        options.push(...moreModules);
      }
    }
    
    // Also check for "any courses beginning with" without comma
    if (this.peek(TokenType.ANY_COURSES_BEGINNING_WITH)) {
      const token = this.consume(TokenType.ANY_COURSES_BEGINNING_WITH)!;
      options.push({
        type: 'prefix',
        prefix: token.value
      });
    }
    
    return options;
  }

  private simplifyStructure(structure: any): any {
    if (structure === null || structure === undefined) {
      return null;
    }
    
    // If it's a string, return as is
    if (typeof structure === 'string') {
      return structure;
    }
    
    // If it's an array
    if (Array.isArray(structure)) {
      const simplified = structure.map(item => this.simplifyStructure(item)).filter(item => item !== null);
      
      if (simplified.length === 0) return null;
      if (simplified.length === 1) return simplified[0];
      
      return simplified;
    }
    
    // If it's an OR structure
    if (structure.type === 'or') {
      const simplifiedReqs = structure.requirements
        .map((req: any) => this.simplifyStructure(req))
        .filter((req: any) => req !== null);
      
      if (simplifiedReqs.length === 0) return null;
      if (simplifiedReqs.length === 1) return simplifiedReqs[0];
      
      return {
        type: 'or',
        requirements: simplifiedReqs
      };
    }
    
    // For other structures, recursively simplify nested elements
    if (structure.type === 'minimum' && structure.options) {
      structure.options = structure.options
        .map((opt: any) => this.simplifyStructure(opt))
        .filter((opt: any) => opt !== null);
    }
    
    return structure;
  }

  private filterIgnoredModules(structure: any): any {
    if (structure === null || structure === undefined) {
      return null;
    }
    
    // If it's a string (single module or slash-separated modules)
    if (typeof structure === 'string') {
      // Handle slash-separated modules
      if (structure.includes('/')) {
        const modules = structure.split('/').map(m => m.trim());
        const filtered = modules.filter(m => !MODULES_TO_IGNORE.includes(m));
        
        if (filtered.length === 0) return null;
        if (filtered.length === 1) return filtered[0];
        return filtered.join('/');
      }
      
      // Single module
      return MODULES_TO_IGNORE.includes(structure) ? null : structure;
    }
    
    // If it's an array
    if (Array.isArray(structure)) {
      const filtered = structure
        .map(item => this.filterIgnoredModules(item))
        .filter(item => item !== null);
      
      if (filtered.length === 0) return null;
      if (filtered.length === 1) return filtered[0];
      return filtered;
    }
    
    // If it's an OR structure
    if (structure.type === 'or') {
      const filteredReqs = structure.requirements
        .map((req: any) => this.filterIgnoredModules(req))
        .filter((req: any) => req !== null);
      
      if (filteredReqs.length === 0) return null;
      if (filteredReqs.length === 1) return filteredReqs[0];
      
      return {
        type: 'or',
        requirements: filteredReqs
      };
    }
    
    // If it's a minimum structure
    if (structure.type === 'minimum' && structure.options) {
      const filteredOptions = structure.options
        .map((opt: any) => this.filterIgnoredModules(opt))
        .filter((opt: any) => opt !== null);
      
      if (filteredOptions.length === 0) return null;
      
      // Adjust count if necessary
      const adjustedCount = Math.min(structure.count, filteredOptions.length);
      
      if (adjustedCount === 1 && filteredOptions.length === 1) {
        return filteredOptions[0];
      }
      
      return {
        type: 'minimum',
        count: adjustedCount,
        options: filteredOptions
      };
    }
    
    // For prefix type, keep as is
    return structure;
  }
}

class PrerequisiteExtractor {
  private processedCount = 0;
  private totalCount = 0;
  private modulesWithPrereqs = 0;
  private modulesWithoutPrereqs = 0;
  private successfullyParsed = 0;

  async extractAllPrerequisites(): Promise<void> {
    try {
      console.log(`Testing Supabase connection to ${CONFIG.TABLE_NAME} table...`);
      const { count, error: testError } = await supabase
        .from(CONFIG.TABLE_NAME)
        .select('*', { count: 'exact', head: true });

      if (testError) {
        throw new Error(`Supabase connection failed: ${testError.message}`);
      }

      console.log(`Connected! Found ${count} total modules in ${CONFIG.TABLE_NAME}`);

      const { data: modules, error } = await supabase
        .from(CONFIG.TABLE_NAME)
        .select('moduleCode, prerequisite')
        .limit(10000);

      if (error) {
        throw new Error(`Failed to read from Supabase: ${error.message}`);
      }

      this.totalCount = modules?.length || 0;
      console.log(`Found ${this.totalCount} total modules in ${CONFIG.TABLE_NAME} table`);
      
      const modulesWithPrereqs = modules?.filter(m => m.prerequisite !== null && m.prerequisite !== '') || [];
      console.log(`${modulesWithPrereqs.length} modules have prerequisites`);
      console.log(`${this.totalCount - modulesWithPrereqs.length} modules have no prerequisites`);
      console.log(''); 

      for (const module of modules || []) {
        this.processedCount++;
        
        // Update counters
        if (!module.prerequisite || module.prerequisite.trim() === '') {
          this.modulesWithoutPrereqs++;
        } else {
          this.modulesWithPrereqs++;
        }
        
        if (this.processedCount % 100 === 0) {
          console.log(`Progress: ${this.processedCount}/${this.totalCount} (${Math.round(this.processedCount/this.totalCount*100)}%)`);
          console.log(`With prereqs: ${this.modulesWithPrereqs}, Without: ${this.modulesWithoutPrereqs}, Successfully parsed: ${this.successfullyParsed}`);
        }

        const result = this.extractPrerequisites(module);
        
        // Count successful parses
        if (module.prerequisite && module.prerequisite.trim() !== '' && result.hardPrerequisites !== null) {
          this.successfullyParsed++;
        }
        
        // Update Supabase 
        const { error: updateError } = await supabase
          .from(CONFIG.TABLE_NAME)
          .update({ hard_prerequisites: result.hardPrerequisites })
          .eq('moduleCode', module.moduleCode);

        if (updateError) {
          console.error(`Failed to update ${module.moduleCode}:`, updateError.message);
        }
      }

      console.log(`\nExtraction complete! Updated ${this.processedCount} modules in ${CONFIG.TABLE_NAME}`);
      console.log(`\nFinal Summary:`);
      console.log(`   Total modules processed: ${this.totalCount}`);
      console.log(`   Modules without prerequisites: ${this.modulesWithoutPrereqs}`);
      console.log(`   Modules with prerequisites: ${this.modulesWithPrereqs}`);
      console.log(`   Successfully parsed prerequisites: ${this.successfullyParsed}`);
      console.log(`   Failed to parse: ${this.modulesWithPrereqs - this.successfullyParsed}`);
      console.log(`   Parse success rate: ${this.modulesWithPrereqs > 0 ? Math.round(this.successfullyParsed/this.modulesWithPrereqs*100) : 0}%`);

    } catch (error) {
      console.error('Error during extraction:', error);
      process.exit(1);
    }
  }

  private extractPrerequisites(module: ModuleData): ExtractionResult {
    if (!module.prerequisite || module.prerequisite.trim() === '') {
      return { hardPrerequisites: null };
    }

    try {
      // Clean and prepare the text
      const cleanedText = this.cleanPrerequisiteText(module.prerequisite);
      
      if (!cleanedText) {
        return { hardPrerequisites: null };
      }

      // Tokenize
      const tokenizer = new PrerequisiteTokenizer(cleanedText);
      const tokens = tokenizer.tokenize();

      // Parse
      const parser = new PrerequisiteParser(tokens);
      const result = parser.parse();
      
      return { hardPrerequisites: result };
      
    } catch (error) {
      console.warn(`Failed to parse ${module.moduleCode}: ${error}`);
      return { hardPrerequisites: null };
    }
  }

  private cleanPrerequisiteText(text: string): string | null {
    // First, fix formatting issues
    text = text
      .replace(/THEN\(/g, 'THEN (')
      .replace(/DegreeTHEN/g, 'Degree THEN ')
      .replace(/([A-Z\+\-])AND/g, '$1 AND ')
      .replace(/([A-Z\+\-])OR/g, '$1 OR ')
      .replace(/DANDmust/g, 'D AND must')
      .replace(/DORmust/g, 'D OR must')
      .replace(/\)AND/g, ') AND ')
      .replace(/\)OR/g, ') OR ')
      .replace(/ANDmust/g, ' AND must')
      .replace(/ORmust/g, ' OR must')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Extract the module requirement part
    const thenMatch = text.match(/If undertaking.*?THEN\s*(.+)$/i);
    if (thenMatch) {
      text = thenMatch[1];
    }
    
    // Remove non-module requirements at the end
    const endPatterns = [
      /\s+AND\s+must have completed EP ENGLISH.*/i,
      /\s+AND\s+must be undertaking.*/i,
      /\s+AND\s+must be in.*cohort.*/i,
      /\s+AND\s+must be Year \d+.*/i
    ];
    
    for (const pattern of endPatterns) {
      text = text.replace(pattern, '');
    }
    
    // Remove grade requirements
    text = text.replace(/at a grade of at least [A-Z\d\+\-]+/gi, '');
    
    // Remove quotes around module codes
    text = text.replace(/"([A-Z]{2,4}\d{4}[A-Z]{0,2})"/g, '$1');
    
    // Normalize whitespace
    text = text.replace(/\s+/g, ' ').trim();
    
    // Check if there's any meaningful content
    if (!text || text.length < 5) {
      return null;
    }
    
    return text;
  }
}

// Run the extraction
const extractor = new PrerequisiteExtractor();
extractor.extractAllPrerequisites().catch(console.error);