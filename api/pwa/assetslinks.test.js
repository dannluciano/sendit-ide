import test from "node:test";
import assert from "node:assert";
import { app } from "../app.js";

test("/.well-known/assetlinks.json", async (t) => {
  const res = await app.request("/.well-known/assetlinks.json");

  const contentTypeComputed = res.headers.get("Content-Type");
  const contentTypeExpected = "application/json";

  assert.equal(contentTypeComputed, contentTypeExpected);

  const statusComputed = res.status;
  const statusExpected = 201;

  assert.equal(statusComputed, statusExpected);

  const bodyComputed = await res.json();
  const bodyExpected = [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: "br.com.dannluciano.sendit.ide.twa",
        sha256_cert_fingerprints: [
          "5E:FC:80:28:1E:52:A8:20:B3:1A:74:E5:EE:62:7C:D7:E6:4E:C2:3B:4F:06:78:0C:4B:A3:FE:CF:E9:B9:13:3D",
          "09:7C:2D:E8:4D:83:02:44:0C:61:06:3F:D8:2F:EC:C5:ED:ED:5E:24:41:21:19:3B:8B:BA:05:76:BF:DF:A1:71",
        ],
      },
    },
  ];

  assert.deepEqual(bodyComputed, bodyExpected);
});
