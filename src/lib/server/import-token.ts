import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/server/prisma";

/**
 * WebClass 自動同期（Tampermonkey のユーザースクリプト）用の取り込みトークン。
 *
 * なぜセッション Cookie ではなくトークンなのか:
 * NextAuth のセッション Cookie は SameSite=Lax なので、WebClass のページから
 * UnionFetch へ投げるクロスサイトのリクエストには付かない。ユーザースクリプトは
 * ブラウザのログイン状態に依存せずに書き込める必要があるため、専用の資格情報を配る。
 *
 * DB には **SHA-256 のハッシュだけ**を保存する。平文は発行時に一度だけ返す。
 * DB が漏れてもトークンとしては使えない（GitHub の Personal Access Token と同じ方針）。
 */

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** 新しいトークンを発行して保存し、平文を返す（既存のトークンは無効になる）。 */
export async function issueImportToken(userId: string): Promise<string> {
  // 32バイト = 256bit。総当たりは非現実的。
  const token = "cm_" + randomBytes(32).toString("base64url");
  await prisma.user.update({
    where: { id: userId },
    data: { importTokenHash: hashToken(token) },
  });
  return token;
}

/** トークンを無効化する。 */
export async function revokeImportToken(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { importTokenHash: null },
  });
}

/**
 * `Authorization: Bearer <token>` から userId を引く。無効なら null。
 *
 * 照合は「ハッシュで検索」なので DB 側のインデックスが効き、
 * 全ユーザーを走査しない＝タイミング差から他人の存在を推測される余地も無い。
 */
export async function resolveImportToken(request: Request): Promise<string | null> {
  const header = request.headers.get("authorization");
  if (!header || !header.startsWith("Bearer ")) return null;

  const token = header.slice("Bearer ".length).trim();
  // 形式が違うものは DB を叩かずに落とす
  if (!token.startsWith("cm_") || token.length > 200) return null;

  const user = await prisma.user.findUnique({
    where: { importTokenHash: hashToken(token) },
    select: { id: true, importTokenHash: true },
  });
  if (!user?.importTokenHash) return null;

  // findUnique で一致済みだが、比較を定数時間で締めておく
  const a = Buffer.from(user.importTokenHash);
  const b = Buffer.from(hashToken(token));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  return user.id;
}
