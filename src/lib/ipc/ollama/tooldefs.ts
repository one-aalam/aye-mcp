import type { Tool as OllamaToolDef } from "ollama";
import { get_current_weather } from "@/tools/defs";

export const get_current_weather_ollama: OllamaToolDef = {
    type: 'function',
    function: {
        name: get_current_weather.name,
        description: get_current_weather.description,
        parameters: get_current_weather.parameters,
    },
};