import bcrypt from "bcryptjs";

import { db } from "../db/client";
import { users } from "../db/schema";

/**
 * Crée (ou met à jour le mot de passe d') un compte admin directement en
 * base — nécessaire une seule fois pour amorcer le système, avant qu'un
 * premier admin puisse créer les comptes suivants depuis /settings/users.
 *
 * Usage: npx tsx scripts/create-admin.ts <email> <mot-de-passe> <nom-complet>
 */
async function main() {
  const [email, password, ...nameParts] = process.argv.slice(2);
  const fullName = nameParts.join(" ");
  if (!email || !password || !fullName) {
    console.error("Usage: npx tsx scripts/create-admin.ts <email> <mot-de-passe> <nom-complet>");
    process.exit(1);
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  await db
    .insert(users)
    .values({ email: email.toLowerCase(), passwordHash, fullName, role: "admin" })
    .onConflictDoUpdate({ target: users.email, set: { passwordHash, fullName, role: "admin" } });

  console.log(`Compte admin "${email}" créé/mis à jour.`);
}

main();
