export function capitalize(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

export function dedupe<T>(arr: T[]): T[] {
    return [...new Set(arr)]
}

export function isValidVariable(name: string) {
    try {
        Function('var ' + name);
    } catch (e) {
        return false;
    }
    return true;
}

export function stripMargin(template: TemplateStringsArray, ...expressions: any[]) {
    const result = template.reduce((accumulator, part, i) => {
        return accumulator + expressions[i - 1] + part;
    });
    return result.replace(/(\n|\r|\r\n)\s*\|/g, '$1').trim();
}