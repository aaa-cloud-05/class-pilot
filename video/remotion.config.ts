import { existsSync } from "node:fs";
import { Config } from "@remotion/cli/config";

// 手元に Chrome が入っていれば使う（Remotion 用のヘッドレス Chrome のダウンロードを省く）
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
if (existsSync(CHROME)) Config.setBrowserExecutable(CHROME);

// 静止画は PNG で書き出す（OG 画像）
Config.setStillImageFormat("png");
