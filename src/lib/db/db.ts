import Database from "@tauri-apps/plugin-sql";
import { DB_PATH } from "@/config";

export const loadDB = async () => await Database.load(`sqlite:${import.meta.env.VITE_DB_PATH || DB_PATH }`);
