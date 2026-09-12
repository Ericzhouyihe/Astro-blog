import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { remarkPostLinks } from "./remark-post-links.mjs";

const sourcePath = fileURLToPath(
	new URL(
		"../content/posts/RNN、LSTM 与 GRU：从记忆到门控机制.md",
		import.meta.url,
	),
);

function transformLink(url) {
	const link = { type: "link", url, children: [] };
	const tree = { type: "root", children: [link] };
	remarkPostLinks({ base: "/Astro-blog" })(tree, { path: sourcePath });
	return link.url;
}

test("converts an encoded relative Markdown link", () => {
	assert.equal(
		transformLink("./RNN%20结构详解.md"),
		encodeURI("/Astro-blog/posts/rnn-结构详解/"),
	);
});

test("converts a project-relative link and keeps its fragment", () => {
	assert.equal(
		transformLink(
			"src/content/posts/RNN、LSTM%20与%20GRU：从记忆到门控机制.md#结论",
		),
		`${encodeURI("/Astro-blog/posts/rnnlstm-与-gru从记忆到门控机制/")}#结论`,
	);
});

test("leaves external and missing Markdown links unchanged", () => {
	assert.equal(
		transformLink("https://example.com/article.md"),
		"https://example.com/article.md",
	);
	assert.equal(transformLink("./不存在.md"), "./不存在.md");
});
