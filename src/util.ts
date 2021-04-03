export function capitalize(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

export function stripMargin(template: TemplateStringsArray, ...expressions: any[]) {
    const result = template.reduce((accumulator, part, i) => {
        return accumulator + expressions[i - 1] + part;
    });
    return result.replace(/(\n|\r|\r\n)\s*\|/g, '$1').trim();
}