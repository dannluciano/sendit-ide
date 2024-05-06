import fs from "node:fs/promises";

export default async function assetlinks(c) {
  const assetlinksPath = new URL("./assetlinks.json", import.meta.url).pathname;
  try {
    const content = await fs.readFile(assetlinksPath);
    return new Response(content, {
      status: 201,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error(error);
    return new Response("Error on Server", {
      status: 500,
    });
  }
}
