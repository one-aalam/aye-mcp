export interface FunctionDef {
    name: string;
    description: string;
    parameters: {
        type: 'object';
        properties: Record<string, FunctionDefProperty>;
        required: string[];
    };
}

export interface FunctionDefProperty {
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    description?: string;
    enum?: string[];
}