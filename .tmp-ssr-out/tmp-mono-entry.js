import { writeFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { useMemo } from "react";
import { parse } from "yaml";
//#region src/data/defaultTemplate.ts
var defaultTemplate = `---
name: Алексей Иванов
title: Frontend-разработчик
theme: auto
accent: auto
avatar: https://api.dicebear.com/7.x/avataaars/svg?seed=Alexey
location: Москва
links:
  - label: GitHuba
    url: https://github.com
    icon: github
  - label: Email
    url: mailto:hello@example.com
    icon: mail
  - label: Telegram
    url: https://t.me
    icon: telegram
---

## О себе
Создаю быстрые и красивые веб-приложения. Люблю чистый код, продуманный UX и современные технологии.

## Навыки
React, TypeScript, Node.js, Vite, Tailwind CSS, Figma

## Опыт
**Senior Frontend Developer** — Acme Inc, 2022–2026

Разработал дизайн-систему и ускорил загрузку приложения на 40%.

##

**Frontend Developer** — Startup Lab, 2020–2022

Запустил MVP за 3 месяца, привлёк 10 000 пользователей.

## Проекты

:::cards
title: Дизайн-система
description: 36 компонентов для продуктов компании
icon: star
url: https://github.com/example/design-system
tags: React, Storybook, Tokens

title: Realtime-дашборд
description: Аналитика в реальном времени на WebSocket
icon: rocket
url: https://github.com/example/realtime-dashboard
tags: TypeScript, WebSocket, D3
:::

## Технологии

| Технология | Опыт | Уровень |
|------------|------|---------|
| React | 6 лет | Expert |
| TypeScript | 4 года | Advanced |
| Node.js | 3 года | Intermediate |

## Пример кода

:::code lang="typescript"
export function greet(name: string): string {
  // Приветствие пользователя
  return 'Привет, ' + name + '!'
}

console.log(greet('мир'))
:::

## FAQ

:::accordion
title: С какими технологиями вы работаете?
content: React, TypeScript, Node.js и Vite — мой основной стек.

title: Как со мной связаться?
content: Напишите на email или в Telegram — отвечаю в течение дня.
:::

## Контакты
Напишите на email или в Telegram — отвечаю в течение дня.
`;
//#endregion
//#region src/lib/cardStyles.ts
function getCardExportCss() {
	return `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; }
    body { -webkit-font-smoothing: antialiased; }
    a { text-decoration: none; color: inherit; }
    img { display: block; max-width: 100%; }

    @keyframes fade-in {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes pulse {
      0%, 100% { opacity: 0.4; }
      50% { opacity: 0.6; }
    }
    .animate-fade-in { animation: fade-in 0.6s ease forwards; opacity: 0; }
    .animate-pulse { animation: pulse 4s ease-in-out infinite; }

    .min-h-full { min-height: 100%; }
    .w-full { width: 100%; }
    .overflow-auto { overflow: auto; }
    .overflow-hidden { overflow: hidden; }
    .relative { position: relative; }
    .absolute { position: absolute; }
    .inset-0 { inset: 0; }
    .pointer-events-none { pointer-events: none; }
    .max-w-2xl { max-width: 42rem; }
    .max-w-xl { max-width: 36rem; }
    .mx-auto { margin-left: auto; margin-right: auto; }
    .px-6 { padding-left: 1.5rem; padding-right: 1.5rem; }
    .px-8 { padding-left: 2rem; padding-right: 2rem; }
    .py-12 { padding-top: 3rem; padding-bottom: 3rem; }
    .py-16 { padding-top: 4rem; padding-bottom: 4rem; }
    .p-8 { padding: 2rem; }
    .p-6 { padding: 1.5rem; }
    .p-5 { padding: 1.25rem; }
    .p-1 { padding: 0.25rem; }
    .p-0\\.5 { padding: 0.125rem; }
    .px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
    .px-4 { padding-left: 1rem; padding-right: 1rem; }
    .py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
    .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
    .pl-4 { padding-left: 1rem; }
    .pl-5 { padding-left: 1.25rem; }
    .pb-2 { padding-bottom: 0.5rem; }
    .pt-6 { padding-top: 1.5rem; }
    .mb-1 { margin-bottom: 0.25rem; }
    .mb-2 { margin-bottom: 0.5rem; }
    .mb-3 { margin-bottom: 0.75rem; }
    .mb-4 { margin-bottom: 1rem; }
    .mb-6 { margin-bottom: 1.5rem; }
    .mb-8 { margin-bottom: 2rem; }
    .mb-10 { margin-bottom: 2.5rem; }
    .mb-12 { margin-bottom: 3rem; }
    .mt-1 { margin-top: 0.25rem; }
    .mt-2 { margin-top: 0.5rem; }
    .mt-4 { margin-top: 1rem; }
    .mt-10 { margin-top: 2.5rem; }
    .mt-16 { margin-top: 4rem; }
    .space-y-4 > * + * { margin-top: 1rem; }
    .space-y-5 > * + * { margin-top: 1.25rem; }
    .space-y-6 > * + * { margin-top: 1.5rem; }
    .space-y-10 > * + * { margin-top: 2.5rem; }
    .space-y-1 > * + * { margin-top: 0.25rem; }
    .gap-2 { gap: 0.5rem; }
    .gap-3 { gap: 0.75rem; }
    .gap-5 { gap: 1.25rem; }
    .gap-6 { gap: 1.5rem; }
    .rounded-full { border-radius: 9999px; }
    .rounded-lg { border-radius: 0.5rem; }
    .rounded-2xl { border-radius: 1rem; }
    .rounded-3xl { border-radius: 1.5rem; }
    .text-xs { font-size: 0.75rem; line-height: 1rem; }
    .text-sm { font-size: 0.875rem; line-height: 1.25rem; }
    .text-base { font-size: 1rem; line-height: 1.5rem; }
    .text-lg { font-size: 1.125rem; line-height: 1.75rem; }
    .text-2xl { font-size: 1.5rem; line-height: 2rem; }
    .text-3xl { font-size: 1.875rem; line-height: 2.25rem; }
    .text-4xl { font-size: 2.25rem; line-height: 2.5rem; }
    .font-bold { font-weight: 700; }
    .font-semibold { font-weight: 600; }
    .font-medium { font-weight: 500; }
    .font-serif { font-family: 'Playfair Display', serif; }
    .font-mono { font-family: 'JetBrains Mono', monospace; }
    .text-center { text-align: center; }
    .leading-tight { line-height: 1.25; }
    .leading-relaxed { line-height: 1.625; }
    .tracking-tight { letter-spacing: -0.025em; }
    .tracking-wide { letter-spacing: 0.025em; }
    .tracking-widest { letter-spacing: 0.1em; }
    .uppercase { text-transform: uppercase; }
    .flex { display: flex; }
    .inline-flex { display: inline-flex; }
    .flex-wrap { flex-wrap: wrap; }
    .items-center { align-items: center; }
    .items-start { align-items: flex-start; }
    .justify-center { justify-content: center; }
    .border-b { border-bottom-width: 1px; border-bottom-style: solid; }
    .border-l-2 { border-left-width: 2px; border-left-style: solid; }
    .border-t { border-top-width: 1px; border-top-style: solid; }
    .list-disc { list-style-type: disc; }
    .object-cover { object-fit: cover; }
    .blur-3xl { filter: blur(64px); }
    .opacity-40 { opacity: 0.4; }
    .opacity-30 { opacity: 0.3; }
    .w-96 { width: 24rem; }
    .h-96 { height: 24rem; }
    .w-80 { width: 20rem; }
    .h-80 { height: 20rem; }
    .-top-32 { top: -8rem; }
    .-right-32 { right: -8rem; }
    .-bottom-32 { bottom: -8rem; }
    .-left-32 { left: -8rem; }
    .transition-opacity { transition: opacity 0.2s; }
    .hover\\:opacity-80:hover { opacity: 0.8; }
    .last\\:mb-0:last-child { margin-bottom: 0; }

    .md-accordion summary { list-style: none; cursor: pointer; }
    .md-accordion summary::-webkit-details-marker { display: none; }
    .md-accordion .md-accordion-caret { display: inline-block; transition: transform 0.2s ease; }
    .md-accordion details[open] .md-accordion-caret { transform: rotate(90deg); }

    .md-card { transition: transform 0.2s ease, filter 0.2s ease; }
    a.md-card:hover { transform: translateY(-2px); filter: brightness(1.15); }
  `;
}
//#endregion
//#region src/themes/shared/Icons.tsx
var ICONS = {
	github: (color, size) => /* @__PURE__ */ jsx("svg", {
		width: size,
		height: size,
		viewBox: "0 0 24 24",
		fill: color,
		children: /* @__PURE__ */ jsx("path", { d: "M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" })
	}),
	mail: (color, size) => /* @__PURE__ */ jsxs("svg", {
		width: size,
		height: size,
		viewBox: "0 0 24 24",
		fill: "none",
		stroke: color,
		strokeWidth: "2",
		strokeLinecap: "round",
		strokeLinejoin: "round",
		children: [/* @__PURE__ */ jsx("rect", {
			x: "2",
			y: "4",
			width: "20",
			height: "16",
			rx: "2"
		}), /* @__PURE__ */ jsx("path", { d: "M22 7l-10 7L2 7" })]
	}),
	telegram: (color, size) => /* @__PURE__ */ jsx("svg", {
		width: size,
		height: size,
		viewBox: "0 0 24 24",
		fill: color,
		children: /* @__PURE__ */ jsx("path", { d: "M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" })
	}),
	link: (color, size) => /* @__PURE__ */ jsxs("svg", {
		width: size,
		height: size,
		viewBox: "0 0 24 24",
		fill: "none",
		stroke: color,
		strokeWidth: "2",
		strokeLinecap: "round",
		strokeLinejoin: "round",
		children: [/* @__PURE__ */ jsx("path", { d: "M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" }), /* @__PURE__ */ jsx("path", { d: "M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" })]
	}),
	star: (color, size) => /* @__PURE__ */ jsx("svg", {
		width: size,
		height: size,
		viewBox: "0 0 24 24",
		fill: color,
		children: /* @__PURE__ */ jsx("path", { d: "M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14 2 9.27l6.91-1.01L12 2z" })
	}),
	rocket: (color, size) => /* @__PURE__ */ jsxs("svg", {
		width: size,
		height: size,
		viewBox: "0 0 24 24",
		fill: "none",
		stroke: color,
		strokeWidth: "2",
		strokeLinecap: "round",
		strokeLinejoin: "round",
		children: [
			/* @__PURE__ */ jsx("path", { d: "M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" }),
			/* @__PURE__ */ jsx("path", { d: "m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" }),
			/* @__PURE__ */ jsx("path", { d: "M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" }),
			/* @__PURE__ */ jsx("path", { d: "M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" })
		]
	}),
	code: (color, size) => /* @__PURE__ */ jsxs("svg", {
		width: size,
		height: size,
		viewBox: "0 0 24 24",
		fill: "none",
		stroke: color,
		strokeWidth: "2",
		strokeLinecap: "round",
		strokeLinejoin: "round",
		children: [/* @__PURE__ */ jsx("polyline", { points: "16 18 22 12 16 6" }), /* @__PURE__ */ jsx("polyline", { points: "8 6 2 12 8 18" })]
	}),
	briefcase: (color, size) => /* @__PURE__ */ jsxs("svg", {
		width: size,
		height: size,
		viewBox: "0 0 24 24",
		fill: "none",
		stroke: color,
		strokeWidth: "2",
		strokeLinecap: "round",
		strokeLinejoin: "round",
		children: [/* @__PURE__ */ jsx("rect", {
			x: "2",
			y: "7",
			width: "20",
			height: "14",
			rx: "2"
		}), /* @__PURE__ */ jsx("path", { d: "M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" })]
	}),
	heart: (color, size) => /* @__PURE__ */ jsx("svg", {
		width: size,
		height: size,
		viewBox: "0 0 24 24",
		fill: "none",
		stroke: color,
		strokeWidth: "2",
		strokeLinecap: "round",
		strokeLinejoin: "round",
		children: /* @__PURE__ */ jsx("path", { d: "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l8.84 8.84 8.84-8.84a5.5 5.5 0 0 0 0-7.78z" })
	}),
	globe: (color, size) => /* @__PURE__ */ jsxs("svg", {
		width: size,
		height: size,
		viewBox: "0 0 24 24",
		fill: "none",
		stroke: color,
		strokeWidth: "2",
		strokeLinecap: "round",
		strokeLinejoin: "round",
		children: [
			/* @__PURE__ */ jsx("circle", {
				cx: "12",
				cy: "12",
				r: "10"
			}),
			/* @__PURE__ */ jsx("line", {
				x1: "2",
				y1: "12",
				x2: "22",
				y2: "12"
			}),
			/* @__PURE__ */ jsx("path", { d: "M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" })
		]
	}),
	user: (color, size) => /* @__PURE__ */ jsxs("svg", {
		width: size,
		height: size,
		viewBox: "0 0 24 24",
		fill: "none",
		stroke: color,
		strokeWidth: "2",
		strokeLinecap: "round",
		strokeLinejoin: "round",
		children: [/* @__PURE__ */ jsx("path", { d: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" }), /* @__PURE__ */ jsx("circle", {
			cx: "12",
			cy: "7",
			r: "4"
		})]
	}),
	zap: (color, size) => /* @__PURE__ */ jsx("svg", {
		width: size,
		height: size,
		viewBox: "0 0 24 24",
		fill: color,
		children: /* @__PURE__ */ jsx("polygon", { points: "13 2 3 14 12 14 11 22 21 10 12 10 13 2" })
	})
};
function Icon({ icon, color, size = 20 }) {
	const render = ICONS[icon?.toLowerCase() ?? "link"] ?? ICONS.link;
	return /* @__PURE__ */ jsx(Fragment, { children: render(color, size) });
}
function LinkIcon({ icon, color }) {
	return /* @__PURE__ */ jsx(Icon, {
		icon,
		color
	});
}
//#endregion
//#region src/themes/shared/ThemeParts.tsx
function SectionContent({ content, className, accent }) {
	return /* @__PURE__ */ jsx("div", {
		className,
		children: /* @__PURE__ */ jsx(ReactMarkdown, {
			components: {
				p: ({ children }) => /* @__PURE__ */ jsx("p", {
					className: "mb-3 last:mb-0",
					children
				}),
				strong: ({ children }) => /* @__PURE__ */ jsx("strong", {
					className: "font-semibold",
					children
				}),
				ul: ({ children }) => /* @__PURE__ */ jsx("ul", {
					className: "list-disc pl-5 space-y-1",
					children
				}),
				li: ({ children }) => /* @__PURE__ */ jsx("li", { children }),
				hr: () => /* @__PURE__ */ jsx("hr", { style: {
					border: "none",
					height: 1,
					margin: "1rem 0",
					opacity: .3,
					background: accent ?? "currentColor"
				} })
			},
			children: content
		})
	});
}
function SkillsTags({ content, accent }) {
	const skills = content.split(/[,;\n]/).map((s) => s.trim()).filter((s) => Boolean(s) && !/^\*+$/.test(s));
	if (skills.length <= 1) return /* @__PURE__ */ jsx(SectionContent, {
		content,
		accent
	});
	return /* @__PURE__ */ jsx("div", {
		className: "flex flex-wrap gap-2",
		children: skills.map((skill) => /* @__PURE__ */ jsx("span", {
			className: "px-3 py-1 rounded-full text-sm font-medium",
			style: {
				backgroundColor: `${accent}22`,
				color: accent
			},
			children: skill
		}, skill))
	});
}
function LinksList({ links, colors, className, variant = "soft" }) {
	if (!links.length) return null;
	const isOutline = variant === "outline";
	const linkStyle = isOutline ? {
		backgroundColor: `${colors.text}0a`,
		border: `1px solid ${colors.textMuted}44`,
		color: colors.text
	} : {
		backgroundColor: `${colors.accent}18`,
		color: colors.accent
	};
	return /* @__PURE__ */ jsx("div", {
		className: `flex flex-wrap gap-3 ${className ?? ""}`,
		children: links.map((link) => /* @__PURE__ */ jsxs("a", {
			href: link.url,
			target: "_blank",
			rel: "noopener noreferrer",
			className: "inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-opacity hover:opacity-80",
			style: linkStyle,
			children: [/* @__PURE__ */ jsx(LinkIcon, {
				icon: link.icon,
				color: isOutline ? colors.text : colors.accent
			}), /* @__PURE__ */ jsx("span", {
				className: "text-sm font-medium",
				children: link.label
			})]
		}, link.url))
	});
}
function Avatar({ src, name, size = 96, shape = "circle", textColor = "#ffffff" }) {
	const borderRadius = shape === "square" ? Math.round(size * .18) : 9999;
	if (src) return /* @__PURE__ */ jsx("img", {
		src,
		alt: name,
		crossOrigin: "anonymous",
		width: size,
		height: size,
		className: "object-cover",
		style: {
			width: size,
			height: size,
			borderRadius
		}
	});
	const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
	return /* @__PURE__ */ jsx("div", {
		className: "flex items-center justify-center font-bold",
		style: {
			width: size,
			height: size,
			fontSize: size * .35,
			background: "var(--accent)",
			color: textColor,
			borderRadius
		},
		children: initials
	});
}
function isSkillsSection(title) {
	return /навык|skill/i.test(title);
}
/**
* Монохромная ли тема: акцент — оттенок серого.
* Используется для декоративных элементов, которые в чёрно-белых темах (Vercel)
* должны оставаться нейтральными.
*/
function isMonochromeAccent(color) {
	const hex = color.replace("#", "");
	if (hex.length < 6) return false;
	const r = hex.slice(0, 2).toLowerCase();
	const g = hex.slice(2, 4).toLowerCase();
	const b = hex.slice(4, 6).toLowerCase();
	return r === g && g === b;
}
//#endregion
//#region src/lib/highlight.ts
/**
* Палитра токенов (GitHub Dark).
* Кодовые блоки всегда рендерятся на тёмном фоне, поэтому цвета не зависят от темы
* и корректно попадают в экспортируемый HTML через inline-стили.
*/
var TOKEN_COLORS = {
	plain: "#e6edf3",
	comment: "#8b949e",
	string: "#a5d6ff",
	number: "#79c0ff",
	keyword: "#ff7b72",
	function: "#d2a8ff",
	type: "#ffa657",
	tag: "#7ee787",
	attr: "#ffa657",
	operator: "#ff7b72",
	punctuation: "#c9d1d9"
};
var JS_KEYWORDS = [
	"break",
	"case",
	"catch",
	"class",
	"const",
	"continue",
	"debugger",
	"default",
	"delete",
	"do",
	"else",
	"export",
	"extends",
	"finally",
	"for",
	"function",
	"if",
	"import",
	"in",
	"instanceof",
	"let",
	"new",
	"of",
	"return",
	"super",
	"switch",
	"this",
	"throw",
	"try",
	"typeof",
	"var",
	"void",
	"while",
	"with",
	"yield",
	"async",
	"await",
	"static",
	"get",
	"set",
	"as",
	"from",
	"null",
	"true",
	"false",
	"undefined",
	"NaN"
];
var TS_KEYWORDS = [
	...JS_KEYWORDS,
	"interface",
	"type",
	"enum",
	"implements",
	"declare",
	"namespace",
	"readonly",
	"private",
	"public",
	"protected",
	"abstract",
	"satisfies",
	"keyof",
	"infer",
	"asserts",
	"unknown",
	"never",
	"any",
	"object",
	"string",
	"number",
	"boolean",
	"symbol",
	"bigint"
];
var PYTHON_KEYWORDS = [
	"and",
	"as",
	"assert",
	"async",
	"await",
	"break",
	"class",
	"continue",
	"def",
	"del",
	"elif",
	"else",
	"except",
	"finally",
	"for",
	"from",
	"global",
	"if",
	"import",
	"in",
	"is",
	"lambda",
	"nonlocal",
	"not",
	"or",
	"pass",
	"raise",
	"return",
	"try",
	"while",
	"with",
	"yield",
	"self",
	"None",
	"True",
	"False"
];
var CSS_KEYWORDS = [
	"important",
	"media",
	"supports",
	"import",
	"keyframes",
	"from",
	"to",
	"and",
	"not",
	"url",
	"calc",
	"var",
	"root"
];
var BASH_KEYWORDS = [
	"if",
	"then",
	"else",
	"elif",
	"fi",
	"for",
	"while",
	"do",
	"done",
	"case",
	"esac",
	"function",
	"return",
	"export",
	"local",
	"in",
	"echo",
	"cd",
	"ls",
	"mkdir",
	"rm",
	"cp",
	"mv",
	"sudo",
	"npm",
	"npx",
	"git",
	"node",
	"yarn",
	"pnpm",
	"docker",
	"exit",
	"set",
	"source",
	"cat",
	"grep",
	"chmod",
	"curl"
];
var JSON_KEYWORDS = [
	"true",
	"false",
	"null"
];
var escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function configFor(lang) {
	const key = lang.toLowerCase().replace(/^\./, "").trim();
	if (!key) return null;
	const base = {
		keywords: [],
		lineComments: ["//", "#"],
		blockComment: true,
		htmlComment: false,
		htmlTags: false,
		backtick: true
	};
	switch (key) {
		case "js":
		case "jsx":
		case "javascript":
		case "mjs":
		case "cjs": return {
			...base,
			keywords: JS_KEYWORDS
		};
		case "ts":
		case "tsx":
		case "typescript": return {
			...base,
			keywords: TS_KEYWORDS
		};
		case "json":
		case "jsonc": return {
			...base,
			keywords: JSON_KEYWORDS,
			lineComments: []
		};
		case "py":
		case "python": return {
			...base,
			keywords: PYTHON_KEYWORDS,
			lineComments: ["#"],
			blockComment: false,
			backtick: false
		};
		case "css":
		case "scss":
		case "less": return {
			...base,
			keywords: CSS_KEYWORDS
		};
		case "sh":
		case "bash":
		case "zsh":
		case "shell": return {
			...base,
			keywords: BASH_KEYWORDS,
			lineComments: ["#"],
			blockComment: false,
			backtick: false
		};
		case "html":
		case "xml":
		case "vue":
		case "svg": return {
			...base,
			lineComments: [],
			blockComment: false,
			htmlComment: true,
			htmlTags: true
		};
		default: return base;
	}
}
function compileRules(config) {
	const rules = [];
	if (config.htmlComment) rules.push({
		type: "comment",
		re: /<!--[\s\S]*?-->/y
	});
	if (config.blockComment) {
		rules.push({
			type: "comment",
			re: /\/\*[\s\S]*?\*\//y
		});
		rules.push({
			type: "comment",
			re: /\/\*[\s\S]*$/y
		});
	}
	if (config.lineComments.length) rules.push({
		type: "comment",
		re: new RegExp(`(?:${config.lineComments.map(escapeRegExp).join("|")})[^\\n]*`, "y")
	});
	rules.push({
		type: "string",
		re: /"(?:\\.|[^"\\\n])*"?/y
	});
	rules.push({
		type: "string",
		re: /'(?:\\.|[^'\\\n])*'?/y
	});
	if (config.backtick) rules.push({
		type: "string",
		re: /`(?:\\.|[^`\\])*`?/y
	});
	if (config.keywords.length) {
		const keywords = [...config.keywords].sort((a, b) => b.length - a.length).map(escapeRegExp);
		rules.push({
			type: "keyword",
			re: new RegExp(`\\b(?:${keywords.join("|")})\\b`, "y")
		});
	}
	rules.push({
		type: "function",
		re: /[A-Za-z_$][\w$]*(?=\s*\()/y
	});
	rules.push({
		type: "type",
		re: /[A-Z][A-Za-z0-9_]*/y
	});
	if (config.htmlTags) {
		rules.push({
			type: "tag",
			re: /<\/?!?[A-Za-z][\w:.-]*/y
		});
		rules.push({
			type: "attr",
			re: /[A-Za-z_:][\w:.-]*(?=\s*=)/y
		});
		rules.push({
			type: "punctuation",
			re: /\/?>/y
		});
	}
	rules.push({
		type: "number",
		re: /\b(?:0[xX][0-9a-fA-F]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b/y
	});
	rules.push({
		type: "operator",
		re: /=>|===|!==|==|!=|<=|>=|&&|\|\||\?\?|\+\+|--|\*\*|[+\-*/%=<>!?:&|^~]+/y
	});
	rules.push({
		type: "punctuation",
		re: /[{}()[\];,.@\\]/y
	});
	rules.push({
		type: "plain",
		re: /[A-Za-z_$][\w$]*/y
	});
	return rules;
}
/**
* Разбивает код на токены для подсветки синтаксиса.
* Без внешних зависимостей: правила применяются по позиции, поэтому строки и комментарии
* выигрывают у ключевых слов внутри них.
*/
function highlightCode(code, lang) {
	const config = configFor(lang);
	if (!config) return [{
		text: code,
		type: "plain"
	}];
	const rules = compileRules(config);
	const tokens = [];
	let index = 0;
	let plainStart = -1;
	const pushPlain = (end) => {
		if (plainStart >= 0 && end > plainStart) tokens.push({
			text: code.slice(plainStart, end),
			type: "plain"
		});
		plainStart = -1;
	};
	while (index < code.length) {
		let matched = false;
		for (const rule of rules) {
			rule.re.lastIndex = index;
			const match = rule.re.exec(code);
			if (match && match[0]) {
				pushPlain(index);
				tokens.push({
					text: match[0],
					type: rule.type
				});
				index += match[0].length;
				matched = true;
				break;
			}
		}
		if (!matched) {
			if (plainStart < 0) plainStart = index;
			index += 1;
		}
	}
	pushPlain(code.length);
	const merged = [];
	for (const token of tokens) {
		const previous = merged[merged.length - 1];
		if (previous && previous.type === token.type) previous.text += token.text;
		else merged.push({ ...token });
	}
	return merged;
}
//#endregion
//#region src/themes/shared/SectionBlocks.tsx
function TableBlock({ data, colors }) {
	const { headers, rows } = data;
	if (!headers.length && !rows.length) return null;
	return /* @__PURE__ */ jsx("div", {
		style: {
			overflowX: "auto",
			border: `1px solid ${colors.accent}33`,
			borderRadius: "0.5rem"
		},
		children: /* @__PURE__ */ jsxs("table", {
			style: {
				width: "100%",
				borderCollapse: "collapse",
				fontSize: "0.875rem",
				lineHeight: 1.5
			},
			children: [headers.length > 0 && /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsx("tr", {
				style: { background: `${colors.accent}18` },
				children: headers.map((header, i) => /* @__PURE__ */ jsx("th", {
					style: {
						padding: "0.5rem 0.75rem",
						textAlign: "left",
						fontWeight: 600,
						whiteSpace: "nowrap",
						color: colors.accent,
						borderBottom: `1px solid ${colors.accent}33`
					},
					children: header
				}, i))
			}) }), /* @__PURE__ */ jsx("tbody", { children: rows.map((row, rowIndex) => /* @__PURE__ */ jsx("tr", { children: row.map((cell, cellIndex) => /* @__PURE__ */ jsx("td", {
				style: {
					padding: "0.5rem 0.75rem",
					verticalAlign: "top",
					borderBottom: rowIndex === rows.length - 1 ? "none" : `1px solid ${colors.textMuted}22`
				},
				children: cell
			}, cellIndex)) }, rowIndex)) })]
		})
	});
}
function AccordionBlock({ items, colors }) {
	if (!items.length) return null;
	return /* @__PURE__ */ jsx("div", {
		className: "md-accordion",
		style: {
			display: "flex",
			flexDirection: "column",
			gap: "0.5rem"
		},
		children: items.map((item, i) => /* @__PURE__ */ jsxs("details", {
			style: {
				background: `${colors.accent}0f`,
				border: `1px solid ${colors.accent}26`,
				borderRadius: "0.5rem",
				overflow: "hidden"
			},
			children: [/* @__PURE__ */ jsxs("summary", {
				style: {
					display: "flex",
					alignItems: "center",
					gap: "0.5rem",
					padding: "0.6rem 0.85rem",
					fontSize: "0.875rem",
					fontWeight: 600,
					color: colors.accent
				},
				children: [/* @__PURE__ */ jsx("span", {
					className: "md-accordion-caret",
					"aria-hidden": "true",
					children: "▸"
				}), /* @__PURE__ */ jsx("span", { children: item.title })]
			}), /* @__PURE__ */ jsx("div", {
				style: {
					padding: "0 0.85rem 0.75rem",
					fontSize: "0.875rem",
					lineHeight: 1.6
				},
				children: /* @__PURE__ */ jsx(SectionContent, {
					content: item.content,
					accent: colors.accent
				})
			})]
		}, i))
	});
}
function CodeBlockView({ data, colors }) {
	const tokens = useMemo(() => highlightCode(data.code, data.lang), [data.code, data.lang]);
	const dots = isMonochromeAccent(colors.accent) ? [
		"#3f3f3f",
		"#525252",
		"#6f6f6f"
	] : [
		"#ff5f56",
		"#ffbd2e",
		"#27c93f"
	];
	return /* @__PURE__ */ jsxs("div", {
		style: {
			borderRadius: "0.5rem",
			overflow: "hidden",
			border: `1px solid ${colors.accent}33`,
			background: "#0d0d0d"
		},
		children: [/* @__PURE__ */ jsxs("div", {
			style: {
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				gap: "0.5rem",
				padding: "0.4rem 0.75rem",
				background: "#1a1a1a",
				borderBottom: "1px solid rgba(255, 255, 255, 0.12)"
			},
			children: [/* @__PURE__ */ jsx("span", {
				style: {
					fontSize: "0.7rem",
					fontWeight: 600,
					letterSpacing: "0.08em",
					textTransform: "uppercase",
					fontFamily: "'JetBrains Mono', monospace",
					color: colors.accent
				},
				children: data.lang || "code"
			}), /* @__PURE__ */ jsx("span", {
				style: {
					display: "flex",
					gap: "0.3rem"
				},
				"aria-hidden": "true",
				children: dots.map((dot) => /* @__PURE__ */ jsx("span", { style: {
					width: 9,
					height: 9,
					borderRadius: "9999px",
					background: dot
				} }, dot))
			})]
		}), /* @__PURE__ */ jsx("pre", {
			style: {
				margin: 0,
				padding: "0.9rem 1rem",
				overflowX: "auto",
				whiteSpace: "pre",
				fontSize: "0.8rem",
				lineHeight: 1.6,
				fontFamily: "'JetBrains Mono', monospace",
				color: TOKEN_COLORS.plain
			},
			children: /* @__PURE__ */ jsx("code", { children: tokens.map((token, i) => /* @__PURE__ */ jsx("span", {
				style: { color: TOKEN_COLORS[token.type] },
				children: token.text
			}, i)) })
		})]
	});
}
/** Короткий читаемый адрес ссылки: github.com/user/repo */
function prettyUrl(url) {
	try {
		const parsed = new URL(url);
		const path = parsed.pathname.replace(/\/+$/, "");
		return `${parsed.host.replace(/^www\./, "")}${path}`;
	} catch {
		return url;
	}
}
function CardGridBlock({ cards, colors }) {
	if (!cards.length) return null;
	return /* @__PURE__ */ jsx("div", {
		style: {
			display: "grid",
			gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
			gap: "0.75rem"
		},
		children: cards.map((card, i) => {
			const boxStyle = {
				display: "block",
				padding: "1rem",
				borderRadius: "0.75rem",
				background: `${colors.accent}0f`,
				border: `1px solid ${colors.accent}26`
			};
			const body = /* @__PURE__ */ jsxs(Fragment, { children: [
				card.icon && /* @__PURE__ */ jsx("div", {
					style: {
						marginBottom: "0.6rem",
						lineHeight: 0
					},
					children: /* @__PURE__ */ jsx(Icon, {
						icon: card.icon,
						color: colors.accent,
						size: 22
					})
				}),
				(card.title || card.url) && /* @__PURE__ */ jsxs("div", {
					style: {
						display: "flex",
						alignItems: "center",
						gap: "0.35rem",
						marginBottom: card.description || card.tags?.length ? "0.35rem" : 0
					},
					children: [card.title && /* @__PURE__ */ jsx("span", {
						style: {
							fontSize: "0.95rem",
							fontWeight: 600,
							lineHeight: 1.3
						},
						children: card.title
					}), card.url && /* @__PURE__ */ jsx("span", {
						"aria-hidden": "true",
						style: {
							fontSize: "0.85rem",
							lineHeight: 1,
							color: colors.accent
						},
						children: "↗"
					})]
				}),
				card.description && /* @__PURE__ */ jsx("div", {
					style: {
						fontSize: "0.8rem",
						lineHeight: 1.5,
						color: colors.textMuted,
						marginBottom: card.tags?.length || card.url ? "0.6rem" : 0
					},
					children: card.description
				}),
				card.tags && card.tags.length > 0 && /* @__PURE__ */ jsx("div", {
					style: {
						display: "flex",
						flexWrap: "wrap",
						gap: "0.3rem",
						marginBottom: card.url ? "0.6rem" : 0
					},
					children: card.tags.map((tag) => /* @__PURE__ */ jsx("span", {
						style: {
							padding: "0.15rem 0.5rem",
							borderRadius: "9999px",
							fontSize: "0.7rem",
							whiteSpace: "nowrap",
							background: `${colors.accent}18`,
							color: colors.accent
						},
						children: tag
					}, tag))
				}),
				card.url && /* @__PURE__ */ jsx("div", {
					style: {
						fontSize: "0.7rem",
						fontFamily: "'JetBrains Mono', monospace",
						color: colors.textMuted,
						overflow: "hidden",
						textOverflow: "ellipsis",
						whiteSpace: "nowrap"
					},
					children: prettyUrl(card.url)
				})
			] });
			return card.url ? /* @__PURE__ */ jsx("a", {
				className: "md-card",
				href: card.url,
				target: "_blank",
				rel: "noopener noreferrer",
				style: {
					...boxStyle,
					color: "inherit",
					textDecoration: "none"
				},
				children: body
			}, i) : /* @__PURE__ */ jsx("div", {
				style: boxStyle,
				children: body
			}, i);
		})
	});
}
/** Рендерит тело секции в зависимости от её типа. */
function SectionBody({ section, colors }) {
	switch (section.type) {
		case "table": return /* @__PURE__ */ jsx(TableBlock, {
			data: section.table ?? {
				headers: [],
				rows: []
			},
			colors
		});
		case "accordion": return /* @__PURE__ */ jsx(AccordionBlock, {
			items: section.accordion ?? [],
			colors
		});
		case "code-block": return /* @__PURE__ */ jsx(CodeBlockView, {
			data: section.code ?? {
				lang: "",
				code: section.content
			},
			colors
		});
		case "card-grid": return /* @__PURE__ */ jsx(CardGridBlock, {
			cards: section.cards ?? [],
			colors
		});
		default: return isSkillsSection(section.title) ? /* @__PURE__ */ jsx(SkillsTags, {
			content: section.content,
			accent: colors.accent
		}) : /* @__PURE__ */ jsx(SectionContent, {
			content: section.content,
			accent: colors.accent
		});
	}
}
//#endregion
//#region src/themes/Glass.tsx
function GlassTheme({ data, colors }) {
	return /* @__PURE__ */ jsx("div", {
		className: "min-h-full w-full overflow-auto relative",
		style: {
			background: `linear-gradient(160deg, ${colors.accentLight}44 0%, ${colors.background} 50%, ${colors.accent}22 100%)`,
			color: colors.text,
			fontFamily: "'Inter', sans-serif",
			["--accent"]: colors.accent
		},
		children: /* @__PURE__ */ jsxs("div", {
			className: "max-w-2xl mx-auto px-6 py-12 space-y-5",
			children: [/* @__PURE__ */ jsxs("header", {
				className: "rounded-3xl p-8 text-center animate-fade-in",
				style: {
					background: "rgba(255,255,255,0.25)",
					backdropFilter: "blur(20px)",
					WebkitBackdropFilter: "blur(20px)",
					border: "1px solid rgba(255,255,255,0.4)",
					boxShadow: "0 8px 32px rgba(0,0,0,0.08)"
				},
				children: [
					/* @__PURE__ */ jsx("div", {
						className: "flex justify-center mb-4",
						children: /* @__PURE__ */ jsx("div", {
							className: "rounded-full p-1",
							style: { background: `linear-gradient(135deg, ${colors.accent}, ${colors.accentLight})` },
							children: /* @__PURE__ */ jsx(Avatar, {
								src: data.avatar,
								name: data.name,
								size: 96
							})
						})
					}),
					/* @__PURE__ */ jsx("h1", {
						className: "text-3xl font-bold tracking-tight",
						children: data.name
					}),
					data.title && /* @__PURE__ */ jsx("p", {
						className: "text-base mt-1 font-medium",
						style: { color: colors.accent },
						children: data.title
					}),
					data.location && /* @__PURE__ */ jsx("p", {
						className: "text-sm mt-2",
						style: { color: colors.textMuted },
						children: data.location
					}),
					/* @__PURE__ */ jsx(LinksList, {
						links: data.links,
						colors,
						className: "justify-center mt-4"
					})
				]
			}), data.sections.map((section, i) => /* @__PURE__ */ jsxs("section", {
				className: "rounded-2xl p-6 animate-fade-in",
				style: {
					background: "rgba(255,255,255,0.2)",
					backdropFilter: "blur(16px)",
					WebkitBackdropFilter: "blur(16px)",
					border: "1px solid rgba(255,255,255,0.35)",
					animationDelay: `${(i + 1) * 100}ms`
				},
				children: [section.title && /* @__PURE__ */ jsx("h2", {
					className: "text-sm font-bold uppercase tracking-widest mb-3",
					style: { color: colors.accent },
					children: section.title
				}), /* @__PURE__ */ jsx("div", {
					style: { color: colors.textMuted },
					children: /* @__PURE__ */ jsx(SectionBody, {
						section,
						colors
					})
				})]
			}, section.title || `piece-${i}`))]
		})
	});
}
//#endregion
//#region src/themes/Minimal.tsx
function MinimalTheme({ data, colors }) {
	return /* @__PURE__ */ jsx("div", {
		className: "min-h-full w-full overflow-auto",
		style: {
			background: colors.background,
			color: colors.text,
			fontFamily: "'Inter', sans-serif",
			["--accent"]: colors.accent
		},
		children: /* @__PURE__ */ jsxs("div", {
			className: "max-w-xl mx-auto px-8 py-16",
			children: [
				/* @__PURE__ */ jsxs("header", {
					className: "mb-12 animate-fade-in",
					children: [/* @__PURE__ */ jsxs("div", {
						className: "flex items-start gap-6 mb-8",
						children: [/* @__PURE__ */ jsx(Avatar, {
							src: data.avatar,
							name: data.name,
							size: 80
						}), /* @__PURE__ */ jsxs("div", { children: [
							/* @__PURE__ */ jsx("h1", {
								className: "text-4xl font-serif leading-tight",
								style: {
									fontFamily: "'Playfair Display', serif",
									color: colors.text
								},
								children: data.name
							}),
							data.title && /* @__PURE__ */ jsx("p", {
								className: "text-base mt-2 tracking-wide",
								style: { color: colors.textMuted },
								children: data.title
							}),
							data.location && /* @__PURE__ */ jsx("p", {
								className: "text-sm mt-1",
								style: { color: colors.textMuted },
								children: data.location
							})
						] })]
					}), /* @__PURE__ */ jsx(LinksList, {
						links: data.links,
						colors
					})]
				}),
				/* @__PURE__ */ jsx("div", {
					className: "space-y-10",
					children: data.sections.map((section, i) => /* @__PURE__ */ jsxs("section", {
						className: "animate-fade-in",
						style: { animationDelay: `${(i + 1) * 100}ms` },
						children: [section.title && /* @__PURE__ */ jsx("h2", {
							className: "text-xs font-semibold uppercase tracking-[0.2em] mb-4",
							style: { color: colors.accent },
							children: section.title
						}), /* @__PURE__ */ jsx("div", {
							className: "pl-4 border-l-2",
							style: {
								borderColor: `${colors.accent}44`,
								color: colors.textMuted
							},
							children: /* @__PURE__ */ jsx(SectionBody, {
								section,
								colors
							})
						})]
					}, section.title || `piece-${i}`))
				}),
				/* @__PURE__ */ jsxs("footer", {
					className: "mt-16 pt-6 border-t text-center text-xs",
					style: {
						borderColor: `${colors.textMuted}33`,
						color: colors.textMuted
					},
					children: [
						data.name,
						" · ",
						(/* @__PURE__ */ new Date()).getFullYear()
					]
				})
			]
		})
	});
}
//#endregion
//#region src/themes/Noir.tsx
function NoirTheme({ data, colors }) {
	return /* @__PURE__ */ jsxs("div", {
		className: "min-h-full w-full overflow-auto",
		style: {
			background: colors.background,
			color: colors.text,
			fontFamily: "'JetBrains Mono', monospace",
			["--accent"]: colors.accent
		},
		children: [/* @__PURE__ */ jsx("div", {
			className: "absolute inset-0 pointer-events-none",
			style: { backgroundImage: `radial-gradient(circle at 20% 50%, ${colors.accent}15 0%, transparent 50%), radial-gradient(circle at 80% 20%, ${colors.accentDark}20 0%, transparent 40%)` }
		}), /* @__PURE__ */ jsxs("div", {
			className: "relative max-w-2xl mx-auto px-6 py-12",
			children: [
				/* @__PURE__ */ jsxs("header", {
					className: "mb-10 animate-fade-in",
					children: [/* @__PURE__ */ jsxs("div", {
						className: "flex items-center gap-5 mb-6",
						children: [/* @__PURE__ */ jsx("div", {
							className: "rounded-lg p-0.5",
							style: { boxShadow: `0 0 20px ${colors.accent}66` },
							children: /* @__PURE__ */ jsx(Avatar, {
								src: data.avatar,
								name: data.name,
								size: 72
							})
						}), /* @__PURE__ */ jsxs("div", { children: [
							/* @__PURE__ */ jsx("p", {
								className: "text-xs uppercase tracking-widest mb-1",
								style: { color: colors.accent },
								children: "// profile"
							}),
							/* @__PURE__ */ jsx("h1", {
								className: "text-2xl font-bold",
								children: data.name
							}),
							data.title && /* @__PURE__ */ jsx("p", {
								className: "text-sm mt-1",
								style: { color: colors.textMuted },
								children: data.title
							}),
							data.location && /* @__PURE__ */ jsxs("p", {
								className: "text-xs mt-1 font-mono",
								style: { color: colors.textMuted },
								children: ["@ ", data.location]
							})
						] })]
					}), /* @__PURE__ */ jsx(LinksList, {
						links: data.links,
						colors
					})]
				}),
				/* @__PURE__ */ jsx("div", {
					className: "space-y-4",
					children: data.sections.map((section, i) => /* @__PURE__ */ jsxs("section", {
						className: "rounded-lg p-5 animate-fade-in",
						style: {
							background: colors.surface,
							border: `1px solid ${colors.accent}33`,
							boxShadow: `0 0 15px ${colors.accent}11`,
							animationDelay: `${(i + 1) * 100}ms`
						},
						children: [section.title && /* @__PURE__ */ jsxs("h2", {
							className: "text-xs font-bold uppercase tracking-widest mb-3 font-mono",
							style: { color: colors.accent },
							children: [
								">",
								" ",
								section.title
							]
						}), /* @__PURE__ */ jsx("div", {
							className: "text-sm leading-relaxed",
							style: { color: colors.textMuted },
							children: /* @__PURE__ */ jsx(SectionBody, {
								section,
								colors
							})
						})]
					}, section.title || `piece-${i}`))
				}),
				/* @__PURE__ */ jsxs("p", {
					className: "text-center text-xs mt-10 font-mono",
					style: { color: `${colors.textMuted}88` },
					children: [
						"/*",
						" generated with md-card ",
						"*/"
					]
				})
			]
		})]
	});
}
//#endregion
//#region src/themes/Vercel.tsx
/** Бордер в духе vercel.com — единственный цвет, которого нет в палитре темы. */
var BORDER = "#262626";
var MONO = "'Geist Mono', 'JetBrains Mono', ui-monospace, monospace";
function VercelTheme({ data, colors }) {
	return /* @__PURE__ */ jsxs("div", {
		className: "min-h-full w-full overflow-auto relative",
		style: {
			background: "#000000",
			color: colors.text,
			fontFamily: "'Geist', 'Inter', ui-sans-serif, system-ui, sans-serif",
			["--accent"]: colors.accent
		},
		children: [/* @__PURE__ */ jsx("div", {
			className: "absolute inset-0 pointer-events-none",
			style: { backgroundImage: `radial-gradient(120% 55% at 50% 0%, ${colors.accent}14 0%, transparent 65%)` }
		}), /* @__PURE__ */ jsxs("div", {
			className: "relative max-w-2xl mx-auto px-6 py-16",
			children: [
				/* @__PURE__ */ jsxs("header", {
					className: "mb-12 animate-fade-in",
					children: [/* @__PURE__ */ jsxs("div", {
						className: "flex items-center gap-5 mb-6",
						children: [/* @__PURE__ */ jsx("div", {
							style: {
								padding: 4,
								borderRadius: 16,
								border: `1px solid ${BORDER}`,
								background: colors.surface
							},
							children: /* @__PURE__ */ jsx(Avatar, {
								src: data.avatar,
								name: data.name,
								size: 72,
								shape: "square",
								textColor: "#000000"
							})
						}), /* @__PURE__ */ jsxs("div", { children: [
							/* @__PURE__ */ jsxs("p", {
								className: "text-xs uppercase tracking-widest mb-2",
								style: {
									fontFamily: MONO,
									color: colors.accent
								},
								children: ["▲ ", data.location || "profile"]
							}),
							/* @__PURE__ */ jsx("h1", {
								className: "text-4xl font-semibold tracking-tight",
								children: data.name
							}),
							data.title && /* @__PURE__ */ jsx("p", {
								className: "text-base mt-2",
								style: { color: colors.textMuted },
								children: data.title
							})
						] })]
					}), /* @__PURE__ */ jsx(LinksList, {
						links: data.links,
						colors,
						variant: "outline"
					})]
				}),
				/* @__PURE__ */ jsx("div", {
					className: "space-y-4",
					children: data.sections.map((section, i) => /* @__PURE__ */ jsxs("section", {
						className: "animate-fade-in",
						style: {
							background: colors.surface,
							border: `1px solid ${BORDER}`,
							borderRadius: 12,
							padding: "1.5rem",
							animationDelay: `${(i + 1) * 100}ms`
						},
						children: [section.title && /* @__PURE__ */ jsx("h2", {
							className: "text-xs uppercase tracking-widest mb-4",
							style: {
								fontFamily: MONO,
								color: colors.accent
							},
							children: section.title
						}), /* @__PURE__ */ jsx("div", {
							className: "text-sm leading-relaxed",
							style: { color: colors.textMuted },
							children: /* @__PURE__ */ jsx(SectionBody, {
								section,
								colors
							})
						})]
					}, section.title || `piece-${i}`))
				}),
				/* @__PURE__ */ jsxs("footer", {
					className: "mt-16 pt-6 text-xs text-center",
					style: {
						fontFamily: MONO,
						borderTop: `1px solid ${BORDER}`,
						color: colors.textMuted
					},
					children: [
						"▲ ",
						data.name,
						" · ",
						(/* @__PURE__ */ new Date()).getFullYear()
					]
				})
			]
		})]
	});
}
//#endregion
//#region src/themes/index.tsx
var THEMES = {
	glass: GlassTheme,
	minimal: MinimalTheme,
	noir: NoirTheme,
	vercel: VercelTheme
};
//#endregion
//#region src/lib/exportHtml.tsx
function slugify(name) {
	return name.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").slice(0, 40) || "card";
}
function exportHtml(data, resolved) {
	const ThemeComponent = THEMES[resolved.theme];
	const body = renderToStaticMarkup(/* @__PURE__ */ jsx(ThemeComponent, {
		data,
		colors: resolved.colors
	}));
	return {
		html: `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(data.name)}${data.title ? ` — ${escapeHtml(data.title)}` : ""}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;700&family=Playfair+Display:wght@700&display=swap" rel="stylesheet" />
  <style>
    :root {
      --accent: ${resolved.colors.accent};
      --accent-light: ${resolved.colors.accentLight};
      --accent-dark: ${resolved.colors.accentDark};
    }
    ${getCardExportCss()}
  </style>
</head>
<body>
  ${body}
</body>
</html>`,
		filename: `card-${slugify(data.name)}.html`
	};
}
function escapeHtml(str) {
	return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
//#endregion
//#region src/lib/parser.ts
var VALID_THEMES = [
	"glass",
	"minimal",
	"noir",
	"vercel"
];
function parseFrontmatter(markdown) {
	const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
	if (!match) return {
		data: {},
		content: markdown
	};
	try {
		return {
			data: parse(match[1]) ?? {},
			content: match[2]
		};
	} catch {
		return {
			data: {},
			content: markdown
		};
	}
}
function parseLinks(raw) {
	if (!Array.isArray(raw)) return [];
	return raw.filter((item) => typeof item === "object" && item !== null).map((item) => ({
		label: String(item.label ?? ""),
		url: String(item.url ?? ""),
		icon: item.icon ? String(item.icon) : void 0
	})).filter((link) => link.label && link.url);
}
function parseTheme(raw) {
	if (typeof raw !== "string") return "auto";
	const normalized = raw.split("#")[0].toLowerCase().trim();
	if (normalized === "auto") return "auto";
	return VALID_THEMES.includes(normalized) ? normalized : "auto";
}
/** Принимаем только #hex и приводим к 6 знакам — суффиксы прозрачности требуют формата #rrggbb. */
function parseAccent(raw) {
	if (raw === void 0 || raw === null) return "auto";
	const value = String(raw).trim().split(/\s+#/)[0].trim().toLowerCase();
	if (value === "auto" || !value) return "auto";
	const hex = value.replace("#", "");
	if (/^[0-9a-f]{3}$/.test(hex)) return `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`;
	if (/^[0-9a-f]{4}$/.test(hex)) return `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`;
	if (/^[0-9a-f]{6}$/.test(hex)) return `#${hex}`;
	if (/^[0-9a-f]{8}$/.test(hex)) return `#${hex.slice(0, 6)}`;
	return "auto";
}
var FENCE_OPEN = /^:::\s*([A-Za-z][\w-]*)\s*(.*)$/;
var FENCE_CLOSE = /^:::\s*$/;
/** Извлекает тело блока :::name ... ::: вместе с атрибутами открывающей строки. */
function extractFence(content, name) {
	const lines = content.split(/\r?\n/);
	const target = name.toLowerCase();
	for (let i = 0; i < lines.length; i++) {
		const open = lines[i].match(FENCE_OPEN);
		if (!open || open[1].toLowerCase() !== target) continue;
		const body = [];
		for (let j = i + 1; j < lines.length; j++) {
			if (FENCE_CLOSE.test(lines[j])) return {
				attrs: open[2].trim(),
				body: body.join("\n").trim()
			};
			body.push(lines[j]);
		}
		return {
			attrs: open[2].trim(),
			body: body.join("\n").trim()
		};
	}
	return null;
}
/** Разбивает тело блока на элементы по пустым строкам. */
function splitBlocks(body) {
	return body.split(/\r?\n\s*\r?\n/).map((block) => block.trim()).filter(Boolean);
}
/** Парсит поля `key: value` одного элемента; строки без ключа дописываются к предыдущему значению. */
function parseFields(block) {
	const fields = {};
	let current = null;
	for (const rawLine of block.split(/\r?\n/)) {
		const line = rawLine.trim();
		if (!line) continue;
		const match = line.match(/^([A-Za-z][\w-]*)\s*:\s?(.*)$/);
		if (match) {
			current = match[1].toLowerCase();
			fields[current] = match[2].trim();
		} else if (current) fields[current] = fields[current] ? `${fields[current]} ${line}` : line;
	}
	return fields;
}
function isTableSeparator(line) {
	return line.includes("-") && /^\s*\|?[\s:|-]*\|?\s*$/.test(line);
}
function isTableContent(content) {
	const lines = content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
	if (!lines.some((line) => line.includes("|"))) return false;
	if (lines.some(isTableSeparator)) return true;
	return lines.filter((line) => /^\|.*\|$/.test(line)).length >= 2;
}
/** Парсит Markdown-таблицу в заголовки и строки. */
function parseTable(content) {
	const lines = content.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.includes("|"));
	if (!lines.length) return {
		headers: [],
		rows: []
	};
	const cells = (line) => line.replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
	const headers = cells(lines[0]);
	return {
		headers,
		rows: lines.slice(1).filter((line) => !isTableSeparator(line)).map((line) => {
			const row = cells(line);
			return headers.map((_, index) => row[index] ?? "");
		})
	};
}
/** Парсит блок :::accordion в список «вопрос — ответ». */
function parseAccordion(content) {
	const fence = extractFence(content, "accordion");
	if (!fence) return [];
	return splitBlocks(fence.body).map((block) => {
		const fields = parseFields(block);
		return {
			title: fields.title ?? "",
			content: fields.content ?? ""
		};
	}).filter((item) => item.title || item.content);
}
/** Парсит блок :::code lang="..." в язык и код. */
function parseCodeBlock(content) {
	const fence = extractFence(content, "code");
	if (!fence) return {
		lang: "",
		code: content.trim()
	};
	const langMatch = fence.attrs.match(/lang\s*=\s*["']?([\w#+-]+)["']?/i);
	return {
		lang: langMatch ? langMatch[1].toLowerCase() : "",
		code: fence.body
	};
}
/** Парсит блок :::cards в список карточек. */
function parseCardGrid(content) {
	const fence = extractFence(content, "cards");
	if (!fence) return [];
	return splitBlocks(fence.body).map((block) => {
		const fields = parseFields(block);
		const tags = (fields.tags ?? "").split(/[,;]/).map((tag) => tag.trim()).filter(Boolean);
		return {
			title: fields.title ?? "",
			description: fields.description ?? "",
			icon: fields.icon || void 0,
			url: (fields.url || fields.link || "").trim() || void 0,
			tags: tags.length ? tags : void 0
		};
	}).filter((card) => card.title || card.description || card.url);
}
/** Определяет тип секции по её содержимому. */
function detectSectionType(content) {
	if (extractFence(content, "code")) return "code-block";
	if (extractFence(content, "accordion")) return "accordion";
	if (extractFence(content, "cards")) return "card-grid";
	if (isTableContent(content)) return "table";
	return "text";
}
/** Собирает секцию вместе с распарсенными данными её типа. */
function buildSection(title, content) {
	const type = detectSectionType(content);
	const section = {
		title,
		content,
		type
	};
	if (type === "table") section.table = parseTable(content);
	else if (type === "accordion") section.accordion = parseAccordion(content);
	else if (type === "code-block") section.code = parseCodeBlock(content);
	else if (type === "card-grid") section.cards = parseCardGrid(content);
	return section;
}
/** Маркер «куска» секции: `##` без названия превращается в разделитель. */
var SECTION_DIVIDER = "***";
/** Заголовок секции: `## Название`, `## ` или `##` (без названия). */
var SECTION_HEADING = /^##(?:\s+(.*))?$/;
function parseSections(content) {
	const sections = [];
	const lines = content.split("\n");
	let currentTitle = "";
	let currentLines = [];
	let open = false;
	let inFence = false;
	const flush = () => {
		const body = currentLines.join("\n").trim();
		if (open && body) sections.push(buildSection(currentTitle, body));
		currentTitle = "";
		currentLines = [];
		open = false;
	};
	for (const line of lines) {
		if (inFence) {
			currentLines.push(line);
			if (FENCE_CLOSE.test(line)) inFence = false;
			continue;
		}
		if (FENCE_OPEN.test(line)) {
			open = true;
			currentLines.push(line);
			inFence = true;
			continue;
		}
		const heading = line.match(SECTION_HEADING);
		const headingTitle = heading ? (heading[1] ?? "").trim() : null;
		if (headingTitle) {
			flush();
			currentTitle = headingTitle;
			open = true;
		} else if (headingTitle === "") if (open) currentLines.push(SECTION_DIVIDER);
		else open = true;
		else {
			if (!open && line.trim()) open = true;
			if (open) currentLines.push(line);
		}
	}
	flush();
	return sections;
}
function parseCardMarkdown(markdown) {
	try {
		const { data, content } = parseFrontmatter(markdown);
		const name = String(data.name ?? "").trim();
		const title = String(data.title ?? "").trim();
		if (!name) return {
			data: null,
			error: "Укажите имя в frontmatter: name: ..."
		};
		const accent = parseAccent(data.accent);
		return {
			data: {
				name,
				title,
				theme: parseTheme(data.theme),
				accent,
				avatar: data.avatar ? String(data.avatar) : void 0,
				location: data.location ? String(data.location) : void 0,
				links: parseLinks(data.links),
				sections: parseSections(content)
			},
			error: null
		};
	} catch (err) {
		return {
			data: null,
			error: err instanceof Error ? err.message : "Ошибка парсинга Markdown"
		};
	}
}
//#endregion
//#region src/lib/themeEngine.ts
function hashString(str) {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		hash = (hash << 5) - hash + str.charCodeAt(i);
		hash |= 0;
	}
	return Math.abs(hash);
}
function hslToHex(h, s, l) {
	s /= 100;
	l /= 100;
	const a = s * Math.min(l, 1 - l);
	const f = (n) => {
		const k = (n + h / 30) % 12;
		const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
		return Math.round(255 * color).toString(16).padStart(2, "0");
	};
	return `#${f(0)}${f(8)}${f(4)}`;
}
function generatePalette(seed) {
	const hue = hashString(seed) % 360;
	return {
		accent: hslToHex(hue, 72, 55),
		accentLight: hslToHex(hue, 65, 70),
		accentDark: hslToHex(hue, 75, 38),
		background: hslToHex(hue, 25, 97),
		surface: "#ffffff",
		text: hslToHex(hue, 15, 15),
		textMuted: hslToHex(hue, 10, 45)
	};
}
var THEME_KEYWORDS = {
	glass: [
		"design",
		"designer",
		"creative",
		"art",
		"ui",
		"ux",
		"illustrat",
		"brand",
		"дизайн",
		"креатив",
		"architect",
		"data",
		"scientist",
		"research",
		"аналит",
		"архитект"
	],
	noir: [
		"developer",
		"engineer",
		"program",
		"code",
		"dev",
		"backend",
		"frontend",
		"fullstack",
		"разработ",
		"инженер"
	],
	minimal: [
		"manager",
		"director",
		"lead",
		"consult",
		"analyst",
		"product",
		"менедж",
		"директор",
		"консульт"
	],
	vercel: [
		"vercel",
		"next.js",
		"nextjs",
		"geist",
		"monochrome",
		"монохром",
		"serverless"
	]
};
function detectTheme(data) {
	const corpus = [data.title, ...data.sections.map((s) => `${s.title} ${s.content}`)].join(" ").toLowerCase();
	let best = "glass";
	let bestScore = 0;
	for (const [theme, keywords] of Object.entries(THEME_KEYWORDS)) {
		const score = keywords.reduce((acc, kw) => acc + (corpus.includes(kw) ? 1 : 0), 0);
		if (score > bestScore) {
			bestScore = score;
			best = theme;
		}
	}
	return bestScore > 0 ? best : "glass";
}
/** Темы, которые всегда остаются чёрно-белыми: пользовательский accent к ним не применяется. */
var MONOCHROME_THEMES = ["vercel"];
function paletteForTheme(theme, seed) {
	const base = generatePalette(seed);
	switch (theme) {
		case "noir": return {
			...base,
			background: "#0a0a0f",
			surface: "#14141f",
			text: "#f0f0f5",
			textMuted: "#8888a0"
		};
		case "minimal": return {
			...base,
			background: "#fafafa",
			surface: "#ffffff",
			text: "#1a1a1a",
			textMuted: "#666666"
		};
		case "glass": return {
			...base,
			background: `linear-gradient(135deg, ${base.accentLight}22, ${base.accent}11)`,
			surface: "rgba(255,255,255,0.15)",
			text: "#1a1a2e",
			textMuted: "#555570"
		};
		case "vercel": return {
			...base,
			accent: "#ffffff",
			accentLight: "#d4d4d4",
			accentDark: "#8f8f8f",
			background: "#000000",
			surface: "#0a0a0a",
			text: "#ededed",
			textMuted: "#8f8f8f"
		};
		default: return base;
	}
}
function resolveTheme(data, overrideTheme) {
	const safe = data ?? {
		name: "Guest",
		title: "",
		theme: "auto",
		accent: "auto",
		links: [],
		sections: []
	};
	const theme = overrideTheme ?? (safe.theme === "auto" ? detectTheme(safe) : safe.theme);
	const seed = safe.name;
	return {
		theme,
		colors: safe.accent !== "auto" && !MONOCHROME_THEMES.includes(theme) ? {
			...paletteForTheme(theme, seed),
			accent: safe.accent,
			accentLight: safe.accent,
			accentDark: safe.accent
		} : paletteForTheme(theme, seed)
	};
}
//#endregion
//#region tmp-mono-entry.tsx
var failures = 0;
function check(label, ok) {
	console.log(`${ok ? "✓" : " "} ${label}`);
	if (!ok) failures++;
}
var HEX = /#([0-9a-fA-F]{6})([0-9a-fA-F]{2})?/g;
/** Все НЕ серые цвета в разметке (r, g, b попарно равны ⇒ оттенок серого) */
function coloredHexes(html) {
	const found = [];
	for (const match of html.matchAll(HEX)) {
		const channels = [
			match[1].slice(0, 2),
			match[1].slice(2, 4),
			match[1].slice(4, 6)
		].map((c) => c.toLowerCase());
		if (!(channels[0] === channels[1] && channels[1] === channels[2])) found.push(match[0].toLowerCase());
	}
	return [...new Set(found)];
}
var isGray = (color) => {
	const hex = color.replace("#", "");
	return hex.slice(0, 2).toLowerCase() === hex.slice(2, 4).toLowerCase() && hex.slice(2, 4).toLowerCase() === hex.slice(4, 6).toLowerCase();
};
var md = (frontmatter, body) => `---\nname: Тест\n${frontmatter}\n---\n\n${body}\n`;
var accentOf = (line) => parseCardMarkdown(md(line, "## О себе\nПривет")).data?.accent;
check("accent: \"#ff5500\" сохраняется", accentOf("accent: \"#ff5500\"") === "#ff5500");
check("accent: 3 знака → 6 (#abc → #aabbcc)", accentOf("accent: \"#abc\"") === "#aabbcc");
check("accent: 8 знаков → без альфы", accentOf("accent: \"#ff550080\"") === "#ff5500");
check("accent: верхний регистр → нижний", accentOf("accent: \"#FF5500\"") === "#ff5500");
check("accent: авто по умолчанию", accentOf("theme: auto") === "auto");
check("accent: мусор → auto", accentOf("accent: red") === "auto");
check("accent: пустое → auto", accentOf("accent: \"\"") === "auto");
var shortAccent = parseCardMarkdown(md("theme: glass\naccent: \"#abc\"", "## Проекты\n\n:::cards\ntitle: A\ndescription: B\nurl: https://example.com\n:::")).data;
var shortHtml = exportHtml(shortAccent, resolveTheme(shortAccent)).html;
check("короткий accent применён (#aabbcc0f)", shortHtml.includes("#aabbcc0f") && shortHtml.includes("#aabbcc26"));
var invalidHex = [...shortHtml.matchAll(/#[0-9a-fA-F]+/g)].map((m) => m[0]).filter((hex) => ![
	4,
	7,
	9
].includes(hex.length));
check("короткий accent: нет hex невалидной длины", invalidHex.length === 0);
console.log("  невалидные hex:", invalidHex.join(", ") || "нет");
var template = parseCardMarkdown(defaultTemplate).data;
var vercel = resolveTheme(template, "vercel");
var glass = resolveTheme(template, "glass");
check("vercel: тема выбрана", vercel.theme === "vercel");
check("vercel: accent = #ffffff", vercel.colors.accent.toLowerCase() === "#ffffff");
check("vercel: все цвета палитры — оттенки серого", [...Object.values(vercel.colors), vercel.colors.background].every(isGray));
check("glass: accent цветной (из имени)", !isGray(glass.colors.accent));
console.log(`  glass accent: ${glass.colors.accent} · vercel accent: ${vercel.colors.accent}`);
var customVercel = parseCardMarkdown(md("theme: vercel\naccent: \"#ff0000\"", "## О себе\nПривет")).data;
var customGlass = parseCardMarkdown(md("theme: glass\naccent: \"#ff0000\"", "## О себе\nПривет")).data;
check("vercel: кастомный accent игнорируется", resolveTheme(customVercel).colors.accent === "#ffffff");
check("vercel: кастомный accent игнорируется и при override", resolveTheme(customVercel, "vercel").colors.accent === "#ffffff");
check("glass: кастомный accent применяется", resolveTheme(customGlass).colors.accent === "#ff0000");
check("glass: переключение на Vercel убирает цвет", resolveTheme(customGlass, "vercel").colors.accent === "#ffffff");
var vercelHtml = exportHtml(template, vercel).html;
var glassHtml = exportHtml(template, glass).html;
writeFileSync(".tmp-vercel-mono.html", vercelHtml);
check("vercel: цвета из имени нет в HTML", !vercelHtml.toLowerCase().includes(glass.colors.accent.toLowerCase()));
check("glass: цвет из имени есть в HTML", glassHtml.toLowerCase().includes(glass.colors.accent.toLowerCase()));
check("vercel: белый акцент в CSS-переменных", vercelHtml.includes("--accent: #ffffff"));
check("vercel: бордер карточки #ffffff26", vercelHtml.includes("#ffffff26"));
check("vercel: фон карточки #ffffff0f", vercelHtml.includes("#ffffff0f"));
check("vercel: рамка таблицы/кода #ffffff33", vercelHtml.includes("#ffffff33"));
check("vercel: белый глоу hero", vercelHtml.includes("#ffffff14"));
var tokenHexes = new Set(Object.values(TOKEN_COLORS).map((c) => c.toLowerCase()));
var colored = coloredHexes(vercelHtml);
check("vercel: цветными остались только токены кода", colored.filter((hex) => !tokenHexes.has(hex.slice(0, 7))).length === 0);
console.log("  цветное в vercel:", colored.join(", ") || "нет");
console.log("  цветное в glass: ", coloredHexes(glassHtml).join(", ") || "нет");
check("vercel: серые «светофоры» кода", vercelHtml.includes("#3f3f3f") && vercelHtml.includes("#6f6f6f"));
check("glass: цветные «светофоры» кода", glassHtml.includes("#ff5f56") && glassHtml.includes("#27c93f"));
var noAvatar = parseCardMarkdown(md("", "## О себе\nПривет")).data;
var initialsColor = (theme) => /background:var\(--accent\);color:(#[0-9a-f]{6})/.exec(exportHtml(noAvatar, resolveTheme(noAvatar, theme)).html)?.[1];
check("vercel: инициалы тёмные на белом", initialsColor("vercel") === "#000000");
check("glass: инициалы белые на акценте", initialsColor("glass") === "#ffffff");
console.log(failures === 0 ? "\nMONOCHROME CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exitCode = failures === 0 ? 0 : 1;
//#endregion
export {};
