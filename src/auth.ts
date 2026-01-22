import * as crypto from "node:crypto";
import axios from "axios";
import {
	clearRefreshToken,
	loadRefreshToken,
	OCA_CONFIG,
	saveRefreshToken,
} from "./config";
import { log } from "./logger";

// PKCE state storage (in-memory, expires after 10 min)
interface PkceState {
	code_verifier: string;
	nonce: string;
	redirect_uri: string;
	created_at: number;
}

const pkceStates = new Map<string, PkceState>();

/**
 * Generate PKCE code verifier (high entropy)
 */
export function generateCodeVerifier(): string {
	return crypto.randomBytes(96).toString("base64url");
}

/**
 * Generate PKCE code challenge from verifier using SHA256
 */
export function generateCodeChallenge(verifier: string): string {
	return crypto.createHash("sha256").update(verifier).digest("base64url");
}

/**
 * Generate random string for state/nonce
 */
export function generateRandomString(length = 32): string {
	return crypto.randomBytes(length).toString("base64url").slice(0, length);
}

/**
 * Clean up expired PKCE states (older than 10 minutes)
 */
export function cleanupExpiredStates(): void {
	const cutoff = Date.now() - 10 * 60 * 1000;
	for (const [state, data] of pkceStates.entries()) {
		if (data.created_at < cutoff) {
			pkceStates.delete(state);
		}
	}
}

/**
 * Create PKCE state and return authorization URL
 */
export function createAuthUrl(redirectUri: string): string {
	cleanupExpiredStates();

	const codeVerifier = generateCodeVerifier();
	const codeChallenge = generateCodeChallenge(codeVerifier);
	const state = generateRandomString(32);
	const nonce = generateRandomString(32);

	// Store PKCE state
	pkceStates.set(state, {
		code_verifier: codeVerifier,
		nonce,
		redirect_uri: redirectUri,
		created_at: Date.now(),
	});

	// Build authorization URL
	const params = new URLSearchParams({
		client_id: OCA_CONFIG.client_id,
		response_type: "code",
		scope: OCA_CONFIG.scopes,
		redirect_uri: redirectUri,
		state,
		nonce,
		code_challenge: codeChallenge,
		code_challenge_method: "S256",
	});

	return `${OCA_CONFIG.idcs_url}/oauth2/v1/authorize?${params.toString()}`;
}

/**
 * Get PKCE state for a given state parameter
 */
export function getPkceState(state: string): PkceState | undefined {
	return pkceStates.get(state);
}

/**
 * Remove PKCE state after use
 */
export function removePkceState(state: string): void {
	pkceStates.delete(state);
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
	code: string,
	codeVerifier: string,
	redirectUri: string,
): Promise<{
	access_token: string;
	refresh_token: string;
	expires_in: number;
}> {
	// Get token endpoint from OIDC discovery
	const discovery = await axios.get(
		`${OCA_CONFIG.idcs_url}/.well-known/openid-configuration`,
	);
	const tokenEndpoint = discovery.data.token_endpoint;

	const params = new URLSearchParams({
		grant_type: "authorization_code",
		code,
		redirect_uri: redirectUri,
		client_id: OCA_CONFIG.client_id,
		code_verifier: codeVerifier,
	});

	const response = await axios.post(tokenEndpoint, params, {
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
	});

	return {
		access_token: response.data.access_token,
		refresh_token: response.data.refresh_token,
		expires_in: response.data.expires_in || 3600,
	};
}

/**
 * Token Manager - handles token refresh and caching
 */
export class TokenManager {
	private refreshToken: string | null = null;
	private accessToken: string | null = null;
	private tokenExpiry: Date | null = null;
	private refreshPromise: Promise<string> | null = null; // Lock to prevent concurrent refreshes

	constructor() {
		this.refreshToken = loadRefreshToken();
		if (this.refreshToken) {
			log.info("Refresh token loaded successfully");
		} else {
			log.warn("No refresh token found. Visit /login to authenticate.");
		}
	}

	isAuthenticated(): boolean {
		return this.refreshToken !== null;
	}

	setRefreshToken(token: string): void {
		this.refreshToken = token;
		this.accessToken = null;
		this.tokenExpiry = null;
		saveRefreshToken(token);
	}

	clearAuth(): void {
		this.refreshToken = null;
		this.accessToken = null;
		this.tokenExpiry = null;
		clearRefreshToken();
	}

	async getToken(): Promise<string> {
		if (!this.refreshToken) {
			throw new Error(
				"Not authenticated. Please visit /login to authenticate with OCA.",
			);
		}

		// Return cached token if still valid (5 min buffer)
		if (this.accessToken && this.tokenExpiry) {
			const timeUntilExpiry = (this.tokenExpiry.getTime() - Date.now()) / 1000;
			if (timeUntilExpiry > 300) {
				log.debug(
					`Using cached access token (expires in ${Math.floor(timeUntilExpiry)}s)`,
				);
				return this.accessToken || "";
			}
		}

		// If a refresh is already in progress, wait for it (prevent concurrent refreshes)
		if (this.refreshPromise) {
			log.debug("Waiting for in-flight token refresh...");
			return this.refreshPromise;
		}

		// Start token refresh
		this.refreshPromise = this.doRefreshToken();

		try {
			return await this.refreshPromise;
		} finally {
			this.refreshPromise = null;
		}
	}

	private async doRefreshToken(): Promise<string> {
		log.info("Refreshing access token using refresh token");
		try {
			const discovery = await axios.get(
				`${OCA_CONFIG.idcs_url}/.well-known/openid-configuration`,
			);
			const tokenEndpoint = discovery.data.token_endpoint;

			const refresh = this.refreshToken;
			if (!refresh)
				throw new Error("Not authenticated. Missing refresh token.");
			const params = new URLSearchParams({
				grant_type: "refresh_token",
				refresh_token: refresh,
				client_id: OCA_CONFIG.client_id,
			});

			const response = await axios.post(tokenEndpoint, params, {
				headers: { "Content-Type": "application/x-www-form-urlencoded" },
			});

			this.accessToken = response.data.access_token;
			const expiresIn = response.data.expires_in || 3600;
			this.tokenExpiry = new Date(Date.now() + expiresIn * 1000);

			// CRITICAL: Save new refresh token if provided (tokens are often single-use)
			const newRefreshToken = response.data.refresh_token;
			if (newRefreshToken && newRefreshToken !== this.refreshToken) {
				log.info("Received new refresh token, updating saved token");
				this.refreshToken = newRefreshToken;
				saveRefreshToken(this.refreshToken || "");
			}

			log.success(
				`Successfully refreshed access token (expires in ${expiresIn}s)`,
			);
			return this.accessToken || "";
		} catch (error: unknown) {
			const err = error as {
				response?: { status?: number; data?: unknown };
				message?: string;
			};
			const status = err.response?.status;
			const data = err.response?.data;

			log.error(
				`Failed to refresh access token: ${status} ${JSON.stringify(data)}`,
			);

			// Check if refresh token is invalid
			const dataObj = (data ?? {}) as { error?: string };
			if (
				status === 400 &&
				(dataObj.error === "invalid_grant" || dataObj.error === "invalid_token")
			) {
				log.error("Refresh token is invalid/expired. Clearing authentication.");
				this.clearAuth();
				throw new Error(
					"Refresh token expired. Please visit /login to re-authenticate.",
				);
			}

			throw new Error(
				`Failed to refresh OCA access token: ${err.message || "unknown error"}`,
			);
		}
	}

	getTokenExpiry(): Date | null {
		return this.tokenExpiry;
	}
}

/**
 * Create OCA-specific headers for requests
 */
export function createOcaHeaders(token: string): Record<string, string> {
	return {
		Authorization: `Bearer ${token}`,
		"opc-request-id": crypto.randomUUID(),
		"Content-Type": "application/json",
	};
}
