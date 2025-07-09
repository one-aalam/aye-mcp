import type { FunctionDef } from "@/types/func";

export const get_current_weather: FunctionDef = {
    name: 'get_current_weather',
    description: 'Get the current weather',
    parameters: {
        type: 'object',
        properties: {
            location: {
                type: 'string',
                description: 'The location to get the weather for',
            },
            unit: {
                type: 'string',
                enum: ['celsius', 'fahrenheit'],
                description: 'The unit to use for the temperature',
            },
        },
        required: ['location', 'unit'],
    },
};