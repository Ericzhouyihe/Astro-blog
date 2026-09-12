import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { slug as githubSlug } from "github-slugger";
import { visit } from "unist-util-visit";

const projectRoot = fileURLToPath(new URL("../..", import.meta.url));
const defaultPostsDirectory = path.join(projectRoot, "src/content/posts");

function normalizeBase(base) {
	const normalized = `/${base ?? ""}`
		.replace(/\/{2,}/g, "/")
		.replace(/\/$/, "");
	return normalized === "/" ? "" : normalized;
}

function splitUrl(url) {
	const suffixStart = url.search(/[?#]/);
	return suffixStart === -1
		? { pathname: url, suffix: "" }
		: { pathname: url.slice(0, suffixStart), suffix: url.slice(suffixStart) };
}

function isInsideDirectory(filePath, directory) {
	const relativePath = path.relative(directory, filePath);
	return (
		relativePath !== "" &&
		!relativePath.startsWith(`..${path.sep}`) &&
		relativePath !== ".." &&
		!path.isAbsolute(relativePath)
	);
}

/**
 * Convert links to Markdown files in src/content/posts into deployed post URLs.
 * The Markdown source remains compatible with editors and GitHub.
 */
export function remarkPostLinks(options = {}) {
	const postsDirectory = path.resolve(
		options.postsDirectory ?? defaultPostsDirectory,
	);
	const base = normalizeBase(options.base);

	return (tree, file) => {
		visit(tree, "link", (node) => {
			if (typeof node.url !== "string") return;

			const { pathname, suffix } = splitUrl(node.url);
			if (!/\.mdx?$/i.test(pathname)) return;

			let decodedPath;
			try {
				decodedPath = decodeURIComponent(pathname).replaceAll("\\", "/");
			} catch {
				return;
			}

			const projectRelativePath = decodedPath.replace(/^\/+/, "");
			let targetPath;
			if (/^src\/content\/posts\//i.test(projectRelativePath)) {
				targetPath = path.resolve(projectRoot, projectRelativePath);
			} else if (file.path) {
				targetPath = path.resolve(path.dirname(file.path), decodedPath);
			} else {
				return;
			}

			if (
				!isInsideDirectory(targetPath, postsDirectory) ||
				!existsSync(targetPath)
			) {
				return;
			}

			const relativePostPath = path
				.relative(postsDirectory, targetPath)
				.replaceAll(path.sep, "/")
				.replace(/\.mdx?$/i, "");
			const slug = relativePostPath
				.split("/")
				.map((segment) => githubSlug(segment))
				.join("/")
				.replace(/\/index$/, "");

			node.url = encodeURI(`${base}/posts/${slug}/`) + suffix;
		});
	};
}
