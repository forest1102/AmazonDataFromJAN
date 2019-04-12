import { withDelay } from './customObs'
import * as client from './fetchBase'
import { Observable } from 'rx'
import * as SECRET from '../config/amazon-secret.json'

import { HmacSHA256 } from 'crypto-js'
import * as Base64 from 'crypto-js/enc-base64'

import * as moment from 'moment'

export type AmazonData = {
	ASIN: string
	price: number
	rank: number
	[key: string]: string | number
}

export function fetch(params: { [key: string]: string }) {
	const _params = {
		...params,
		'MarketplaceId': 'A1VC38T7YXB528',
		'AWSAccessKeyId': SECRET.ACCESSKEYID,
		'SellerId': SECRET.SELLERID,
		'SignatureMethod': 'HmacSHA256',
		'SignatureVersion': '2',
		'Timestamp': moment().utc().format(),
		'Version': '2011-10-01',
	}
	const encodedParams = client.serialize(_params, 'utf8')

	const sign = 'GET\nmws.amazonservices.jp\n/Products/2011-10-01\n' + encodedParams

	const Signature = Base64.stringify(HmacSHA256(sign, SECRET.SECRETKEY))

	return client.fetch(`https://mws.amazonservices.jp/Products/2011-10-01?`
		+ encodedParams + '&' + client.serialize({ Signature }, 'utf8'), false)
}
