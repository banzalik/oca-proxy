import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { EventEmitter } from "node:events"

export const colors = {
	reset: "\x1b[0m",
	bright: "\x1b[1m",
	dim: "\x1b[2m",
	underscore: "\x1b[4m",
	black: "\x1b[30m",
	red: "\x1b[31m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	blue: "\x1b[34m",
	magenta: "\x1b[35m",
	cyan: "\x1b[36m",
	white: "\x1b[37m",
	bgBlack: "\x1b[40m",
	bgRed: "\x1b[41m",
	bgGreen: "\x1b[42m",
	bgYellow: "\x1b[43m",
	bgBlue: "\x1b[44m",
	bgMagenta: "\x1b[45m",
	bgCyan: "\x1b[46m",
	bgWhite: "\x1b[47m",
}

export function colorize(text: string, ...colorCodes: string[]): string {
	return `${colorCodes.join("")}${text}${colors.reset}`
}

export type LogEvent = {
	ts: string
	level: string
	message?: string
	type?: string
	method?: string
	path?: string
	status?: number
	duration?: number
	extra?: string
}

const LOG_DIR = path.join(os.homedir(), ".config", "oca", "logs")
let currentDate = new Date().toISOString().slice(0, 10)
let stream: fs.WriteStream | null = null
function ensureDir() {
	if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true })
}
function openStream() {
	ensureDir()
	const file = path.join(LOG_DIR, `${currentDate}.log`)
	if (stream) try { stream.end() } catch {}
	stream = fs.createWriteStream(file, { flags: "a" })
	pruneOldLogs()
}
function rotateIfNeeded() {
	const d = new Date().toISOString().slice(0, 10)
	if (d !== currentDate || !stream) {
		currentDate = d
		openStream()
	}
}
function writeEvent(ev: LogEvent) {
	try {
		rotateIfNeeded()
		const line = JSON.stringify(ev)
		stream?.write(`${line}\n`)
		logBus.emit("log", ev)
	} catch {}
}
function pruneOldLogs() {
	try {
		const files = fs.readdirSync(LOG_DIR).filter(f => /\d{4}-\d{2}-\d{2}\.log$/.test(f))
		const now = Date.now()
		for (const f of files) {
			const dateStr = f.slice(0, 10)
			const t = Date.parse(dateStr)
			if (!Number.isNaN(t) && now - t > 30 * 24 * 60 * 60 * 1000) {
				try { fs.unlinkSync(path.join(LOG_DIR, f)) } catch {}
			}
		}
	} catch {}
}
openStream()

export const logBus = new EventEmitter()

export const log = {
	info: (msg: string) => {
		console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`)
		writeEvent({ ts: new Date().toISOString(), level: "info", message: msg, type: "log" })
	},
	success: (msg: string) => {
		console.log(`${colors.green}✓${colors.reset} ${msg}`)
		writeEvent({ ts: new Date().toISOString(), level: "success", message: msg, type: "log" })
	},
	warn: (msg: string) => {
		console.log(`${colors.yellow}⚠${colors.reset} ${colors.yellow}${msg}${colors.reset}`)
		writeEvent({ ts: new Date().toISOString(), level: "warn", message: msg, type: "log" })
	},
	error: (msg: string) => {
		console.log(`${colors.red}✗${colors.reset} ${colors.red}${msg}${colors.reset}`)
		writeEvent({ ts: new Date().toISOString(), level: "error", message: msg, type: "log" })
	},
	debug: (msg: string) => {
		console.log(`${colors.dim}${msg}${colors.reset}`)
		writeEvent({ ts: new Date().toISOString(), level: "debug", message: msg, type: "log" })
	},
	auth: (msg: string) => {
		console.log(`${colors.yellow}[Auth]${colors.reset} ${msg}`)
		writeEvent({ ts: new Date().toISOString(), level: "auth", message: msg, type: "log" })
	},
	anthropic: (msg: string) => {
		console.log(`${colors.magenta}[Anthropic]${colors.reset} ${msg}`)
		writeEvent({ ts: new Date().toISOString(), level: "anthropic", message: msg, type: "log" })
	},
	openai: (msg: string) => {
		console.log(`${colors.blue}[OpenAI]${colors.reset} ${msg}`)
		writeEvent({ ts: new Date().toISOString(), level: "openai", message: msg, type: "log" })
	},
	request: (method: string, p: string, extra?: string) => {
		const methodColors: Record<string, string> = { GET: colors.green, POST: colors.blue, PUT: colors.yellow, DELETE: colors.red, PATCH: colors.cyan }
		const color = methodColors[method] || colors.white
		const extraStr = extra ? ` ${colors.dim}${extra}${colors.reset}` : ""
		console.log(`${color}${colors.bright}${method}${colors.reset} ${p}${extraStr}`)
		writeEvent({ ts: new Date().toISOString(), level: "request", type: "request", method, path: p, extra })
	},
	response: (status: number, p: string, duration?: number) => {
		let statusColor = colors.green
		if (status >= 400) statusColor = colors.red
		else if (status >= 300) statusColor = colors.yellow
		const durationStr = duration ? ` ${colors.dim}${duration}ms${colors.reset}` : ""
		console.log(`${statusColor}${status}${colors.reset} ${p}${durationStr}`)
		writeEvent({ ts: new Date().toISOString(), level: "response", type: "response", status, path: p, duration })
	},
	blank: () => console.log(""),
	raw: (...args: unknown[]) => console.log(...(args as unknown as [])),
}

export function drawBox(lines: string[], width: number = 60): string[] {
	const c = colors.cyan + colors.bright
	const r = colors.reset
	const result: string[] = []
	result.push(`${c}╔${"═".repeat(width)}╗${r}`)
	for (const line of lines) {
		const ansiPattern = "\\x1B\\[[0-9;]*m"
		const plainLine = line.replace(new RegExp(ansiPattern, "g"), "")
		const padding = width - plainLine.length
		if (padding > 0) result.push(`${c}║${r}${line}${" ".repeat(padding)}${c}║${r}`)
		else result.push(`${c}║${r}${line.substring(0, width)}${c}║${r}`)
	}
	result.push(`${c}╚${"═".repeat(width)}╝${r}`)
	return result
}

export function separator(char: string = "═", width: number = 60): string {
	return `${colors.cyan}${colors.bright}╠${char.repeat(width)}╣${colors.reset}`
}

export function keyValue(key: string, value: string, keyWidth: number = 14): string {
	const paddedKey = key.padEnd(keyWidth)
	return `  ${colors.dim}${paddedKey}${colors.reset} ${value}`
}
