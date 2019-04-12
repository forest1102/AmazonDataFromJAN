import * as client from 'cheerio-httpcli'
import * as Rx from 'rx'

import { withDelay } from './customObs'


export const serialize = (obj: {}, encoding: string) => {
	return Object.keys(obj)
		.sort()
		.map(key => `${encodeURIComponent(key)}=${encodeURIComponent(obj[key])}`)
		.join('&')
}

export const fetch = (url: string, retry = true, wait = 0) =>
	Rx.Observable.fromPromise(client.fetch(url))
		.map((result) => {
			console.log(url)
			return result.$
		})
		.let(
			obs =>
				retry ?
					obs.retryWhen(withDelay) :
					obs
		)
		.let(
			obs =>
				(wait > 0) ?
					obs
						.delay(wait) :
					obs
		)
