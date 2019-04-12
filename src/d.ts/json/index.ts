declare module "*/config/amazon-secret.json" {
	const value: {

		"SSID": string
		"ACCESSKEYID": string
		"SECRETKEY": string
		"SELLERID": string
	}
	export = value
}
declare module "*/config/serviceAccount.json" {
	const value: {
		[key: string]: any
	}
	export = value
}

