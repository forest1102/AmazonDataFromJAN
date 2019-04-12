import * as Rx from 'rx'
import * as client from './fetchBase'
import { searchKeys } from './title'

export type YahooParams = {
	store_id: string
	price_from?: number
	price_to?: number
	query?: string
}

const HITS_NUM = 50

export const fetch = (params: YahooParams) =>
	Rx.Observable.of({
		...params,
		appid: 'dj00aiZpPXdKZDg1NW1ka0kyVCZzPWNvbnN1bWVyc2VjcmV0Jng9ZTM-',
		hits: HITS_NUM,
		condition: 'new',
		availability: 1,
	})
		.map(p => 'https://shopping.yahooapis.jp/ShoppingWebService/V1/itemSearch?'
			+ client.serialize(p, 'utf8'))
		.concatMap(url => client.fetch(url, true, 1000))

export const fetchAll = params =>
	fetch(params)
		.map($ =>
			Rx.Observable.of(Math.ceil((parseInt($('ResultSet').attr('totalResultsAvailable')) || 0) / HITS_NUM))
				.flatMap(pages => Rx.Observable.if(
					() => pages > 1,
					Rx.Observable.range(1, pages - 1)
				))
				.map(p => p * HITS_NUM)
				.take((1000 - HITS_NUM) / HITS_NUM)
				.concatMap(offset => fetch({
					...params,
					offset
				}))
				.startWith($)
		)

export const toYahooParam = (obs: Rx.Observable<(string | number)[]>) =>
	obs.map(arr => arr
		.reduce(
			(acc, cur, i) => ({
				...acc,
				[searchKeys[i]]: cur
			}), {} as YahooParams)
	)

