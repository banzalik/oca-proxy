module.exports = {
	apps: [
		{
			name: "oca-proxy",
			script: "bin/oca-proxy.js",
			env: {
				NODE_ENV: "production",
				PORT: 8669,
			},
			max_restarts: 10,
			min_uptime: "10s",
			health_check: {
				url: "http://localhost:8669/health",
				method: "GET",
				status_code: 200,
				interval: 10000,
				timeout: 3000,
			},
		},
	],
}
