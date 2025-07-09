import { get_current_weather } from "@/tools/defs";
import type { GenaiToolDef } from "./types";

export const get_current_weather_genai: GenaiToolDef = {
    name: get_current_weather.name,
    description: get_current_weather.description,
    schema: get_current_weather.parameters,
};