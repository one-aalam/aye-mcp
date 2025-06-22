import Database from "@tauri-apps/plugin-sql";
import { DB_PATH } from "@/config";

export const loadDB = async () => await Database.load(`sqlite:${DB_PATH}`);
