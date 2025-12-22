/**
 * Safe expression evaluator for French social contributions
 * NO eval() or Function() - uses a simple parser
 */

type EvalContext = Record<string, number | boolean>;

interface Token {
  type: 'number' | 'identifier' | 'operator' | 'lparen' | 'rparen' | 'comma' | 'comparison' | 'logical';
  value: string | number;
}

/**
 * Tokenize an expression string
 */
function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  
  while (i < expr.length) {
    const char = expr[i];
    
    // Skip whitespace
    if (/\s/.test(char)) {
      i++;
      continue;
    }
    
    // Numbers (including decimals)
    if (/[0-9.]/.test(char)) {
      let num = '';
      while (i < expr.length && /[0-9.]/.test(expr[i])) {
        num += expr[i];
        i++;
      }
      tokens.push({ type: 'number', value: parseFloat(num) });
      continue;
    }
    
    // Identifiers (variables, functions)
    if (/[a-zA-Z_]/.test(char)) {
      let id = '';
      while (i < expr.length && /[a-zA-Z0-9_]/.test(expr[i])) {
        id += expr[i];
        i++;
      }
      // Check for logical operators
      if (id === 'AND' || id === 'OR') {
        tokens.push({ type: 'logical', value: id });
      } else if (id === 'true' || id === 'false') {
        tokens.push({ type: 'number', value: id === 'true' ? 1 : 0 });
      } else {
        tokens.push({ type: 'identifier', value: id });
      }
      continue;
    }
    
    // Two-character operators
    if (i + 1 < expr.length) {
      const twoChar = expr.substring(i, i + 2);
      if (['<=', '>=', '==', '!=', '&&', '||'].includes(twoChar)) {
        if (twoChar === '&&' || twoChar === '||') {
          tokens.push({ type: 'logical', value: twoChar });
        } else {
          tokens.push({ type: 'comparison', value: twoChar });
        }
        i += 2;
        continue;
      }
    }
    
    // Single-character operators
    if (['+', '-', '*', '/'].includes(char)) {
      tokens.push({ type: 'operator', value: char });
      i++;
      continue;
    }
    
    // Comparison operators
    if (['<', '>'].includes(char)) {
      tokens.push({ type: 'comparison', value: char });
      i++;
      continue;
    }
    
    // Parentheses
    if (char === '(') {
      tokens.push({ type: 'lparen', value: '(' });
      i++;
      continue;
    }
    if (char === ')') {
      tokens.push({ type: 'rparen', value: ')' });
      i++;
      continue;
    }
    
    // Comma
    if (char === ',') {
      tokens.push({ type: 'comma', value: ',' });
      i++;
      continue;
    }
    
    // Unknown character, skip
    i++;
  }
  
  return tokens;
}

/**
 * Simple recursive descent parser for arithmetic expressions
 */
class ExprParser {
  private tokens: Token[];
  private pos: number;
  private context: EvalContext;
  
  constructor(tokens: Token[], context: EvalContext) {
    this.tokens = tokens;
    this.pos = 0;
    this.context = context;
  }
  
  private current(): Token | undefined {
    return this.tokens[this.pos];
  }
  
  private consume(): Token | undefined {
    return this.tokens[this.pos++];
  }
  
  private peek(type: string): boolean {
    return this.current()?.type === type;
  }
  
  parse(): number {
    return this.parseLogicalOr();
  }
  
  private parseLogicalOr(): number {
    let left = this.parseLogicalAnd();
    
    while (this.current()?.type === 'logical' && 
           (this.current()?.value === 'OR' || this.current()?.value === '||')) {
      this.consume();
      const right = this.parseLogicalAnd();
      left = (left !== 0 || right !== 0) ? 1 : 0;
    }
    
    return left;
  }
  
  private parseLogicalAnd(): number {
    let left = this.parseComparison();
    
    while (this.current()?.type === 'logical' && 
           (this.current()?.value === 'AND' || this.current()?.value === '&&')) {
      this.consume();
      const right = this.parseComparison();
      left = (left !== 0 && right !== 0) ? 1 : 0;
    }
    
    return left;
  }
  
  private parseComparison(): number {
    let left = this.parseAddSub();
    
    while (this.current()?.type === 'comparison') {
      const op = this.consume()!.value as string;
      const right = this.parseAddSub();
      
      switch (op) {
        case '<': left = left < right ? 1 : 0; break;
        case '>': left = left > right ? 1 : 0; break;
        case '<=': left = left <= right ? 1 : 0; break;
        case '>=': left = left >= right ? 1 : 0; break;
        case '==': left = left === right ? 1 : 0; break;
        case '!=': left = left !== right ? 1 : 0; break;
      }
    }
    
    return left;
  }
  
  private parseAddSub(): number {
    let left = this.parseMulDiv();
    
    while (this.current()?.type === 'operator' && 
           (this.current()?.value === '+' || this.current()?.value === '-')) {
      const op = this.consume()!.value as string;
      const right = this.parseMulDiv();
      left = op === '+' ? left + right : left - right;
    }
    
    return left;
  }
  
  private parseMulDiv(): number {
    let left = this.parseUnary();
    
    while (this.current()?.type === 'operator' && 
           (this.current()?.value === '*' || this.current()?.value === '/')) {
      const op = this.consume()!.value as string;
      const right = this.parseUnary();
      left = op === '*' ? left * right : (right !== 0 ? left / right : 0);
    }
    
    return left;
  }
  
  private parseUnary(): number {
    if (this.current()?.type === 'operator' && this.current()?.value === '-') {
      this.consume();
      return -this.parsePrimary();
    }
    return this.parsePrimary();
  }
  
  private parsePrimary(): number {
    const token = this.current();
    
    if (!token) {
      return 0;
    }
    
    // Number literal
    if (token.type === 'number') {
      this.consume();
      return token.value as number;
    }
    
    // Identifier (variable or function)
    if (token.type === 'identifier') {
      const name = token.value as string;
      this.consume();
      
      // Check if it's a function call
      if (this.current()?.type === 'lparen') {
        return this.parseFunction(name);
      }
      
      // Variable lookup
      const value = this.context[name];
      if (typeof value === 'boolean') {
        return value ? 1 : 0;
      }
      if (typeof value === 'number') {
        return value;
      }
      // Unknown variable, return 0
      return 0;
    }
    
    // Parenthesized expression
    if (token.type === 'lparen') {
      this.consume();
      const result = this.parse();
      if (this.current()?.type === 'rparen') {
        this.consume();
      }
      return result;
    }
    
    return 0;
  }
  
  private parseFunction(name: string): number {
    // Consume '('
    this.consume();
    
    const args: number[] = [];
    
    // Parse arguments
    while (this.current() && this.current()?.type !== 'rparen') {
      args.push(this.parse());
      if (this.current()?.type === 'comma') {
        this.consume();
      }
    }
    
    // Consume ')'
    if (this.current()?.type === 'rparen') {
      this.consume();
    }
    
    // Execute function
    switch (name.toLowerCase()) {
      case 'min':
        return args.length > 0 ? Math.min(...args) : 0;
      case 'max':
        return args.length > 0 ? Math.max(...args) : 0;
      default:
        return 0;
    }
  }
}

/**
 * Evaluate a mathematical/logical expression safely
 * Supports: +, -, *, /, min(), max(), <, <=, >, >=, ==, !=, AND, OR
 */
export function evalExpr(expr: string, context: EvalContext): number {
  if (!expr || expr.trim() === '') {
    return 0;
  }
  
  try {
    const tokens = tokenize(expr);
    const parser = new ExprParser(tokens, context);
    return parser.parse();
  } catch (error) {
    console.error('Expression evaluation error:', expr, error);
    return 0;
  }
}

/**
 * Evaluate a condition expression, returning boolean
 */
export function evalCondition(expr: string, context: EvalContext): boolean {
  return evalExpr(expr, context) !== 0;
}
