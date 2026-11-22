import { readFileSync } from "node:fs";
import { webcrypto } from "node:crypto";
import assert from "node:assert/strict";

const source = readFileSync("subtitles.js", "utf8");
const mockDocument = { querySelector: () => null };
const mockWindow = {};
new Function("document", "window", "crypto", source)(mockDocument, mockWindow, webcrypto);

const srt = "1\n00:00:01,000 --> 00:00:03,250\nFirst caption\n\n2\n00:00:04,000 --> 00:00:05,500\nSecond caption";
const parsedSrt = mockWindow.NRDSubtitles.parseSubtitleFile(srt);
assert.equal(parsedSrt.length, 2, "SRT parser should read two cues");
assert.equal(parsedSrt[0].start, 1000);
assert.equal(parsedSrt[0].end, 3250);
assert.equal(parsedSrt[1].text, "Second caption");

const vtt = "WEBVTT\n\n00:00:00.500 --> 00:00:02.000\nHello from VTT";
const parsedVtt = mockWindow.NRDSubtitles.parseSubtitleFile(vtt);
assert.equal(parsedVtt.length, 1, "VTT parser should read one cue");
assert.equal(parsedVtt[0].start, 500);
assert.equal(parsedVtt[0].end, 2000);

mockWindow.NRDSubtitles.setCues(parsedVtt);
assert.equal(mockWindow.NRDSubtitles.getCues()[0].text, "Hello from VTT");
console.log("NRD subtitle parsing checks passed.");
