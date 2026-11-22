import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const source = readFileSync("render.js", "utf8");
const mockDocument = { querySelector: () => null };
const supportedRecorder = { isTypeSupported: type => type === "video/webm;codecs=vp8" };
const canvasApi = { prototype: { captureStream() {} } };
const mockWindow = { MediaRecorder: supportedRecorder };

new Function("document", "window", "HTMLCanvasElement", "MediaRecorder", source)(
  mockDocument,
  mockWindow,
  canvasApi,
  supportedRecorder
);

const api = mockWindow.NRDRenderer;
assert.ok(api, "Renderer API should be exposed");

assert.deepEqual(api.outputDimensions("9:16", 720), { width:720, height:1280 });
assert.deepEqual(api.outputDimensions("16:9", 720), { width:1280, height:720 });
assert.deepEqual(api.outputDimensions("1:1", 480), { width:480, height:480 });

for (const format of ["9:16","16:9","1:1"]) {
  const result = api.outputDimensions(format, 720);
  assert.equal(result.width % 2, 0, "Width should be encoder-friendly and even");
  assert.equal(result.height % 2, 0, "Height should be encoder-friendly and even");
}

assert.equal(api.chooseMimeType(), "video/webm;codecs=vp8", "Choose the first supported recording codec");

const unsupportedWindow = { MediaRecorder: undefined };
const unsupportedApi = {};
new Function("document", "window", "HTMLCanvasElement", "MediaRecorder", source)(
  mockDocument,
  unsupportedWindow,
  canvasApi,
  undefined
);
assert.equal(unsupportedWindow.NRDRenderer.chooseMimeType(), "", "Gracefully report missing recording support");

console.log("NRD renderer capability and dimension checks passed.");
