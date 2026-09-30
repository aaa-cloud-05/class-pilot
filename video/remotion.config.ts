import { existsSync } from "node:fs";
import { Config } from "@remotion/cli/config";

// 手元に Chrome が入っていれば使う（Remotion 用のヘッドレス Chrome のダウンロードを省く）
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
if (existsSync(CHROME)) Config.setBrowserExecutable(CHROME);

// 静止画は PNG で書き出す（OG 画像）
Config.setStillImageFormat("png");

// 動画は BT.709（yuv420p・標準の色域）で書き出す。既定だと full range の yuvj420p になり、X などで弾かれることがある
Config.setColorSpace("bt709");
