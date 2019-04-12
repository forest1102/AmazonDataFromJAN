import * as Rx from 'rx'
import * as YahooAPI from './YahooAPI'
import * as AmazonAPI from './AmazonAPI'
import { titleKeys } from './title'
import * as fs from 'fs-extra'
import * as path from 'path'

import * as apis from './googleapi'

const sheetListPath = path.join(__dirname, '../config/sheet-list.json')

export const getYahooItemList = (params: YahooAPI.YahooParams) =>
	YahooAPI.fetchAll(params)
		.concatMap(obs =>
			obs
				.flatMap($ =>
					$('Hit')
						.toArray()
						.map(e => ({
							'商品名': $('Name', e).text(),
							'yahoo店舗価格': parseInt($('Price', e).text()) || 0,
							JAN: $('JanCode', e).text(),
							'ストアID': params.store_id,
							'URL': $('Url', e).first().text()
						}))
				)
		)
		.catch(err => Rx.Observable.return({
			'商品名': '',
			'yahoo店舗価格': 0,
			JAN: '',
			'ストアID': params.store_id,
			'URL': ''
		}))

export const JANsToASINs = (janObs: Rx.Observable<string>) =>
	janObs
		.bufferWithCount(5)
		.map(arr => ({
			len: arr.length,
			...arr
				.map((jan, i) => ({ jan, i }))
				.filter(({ jan }) => !!jan)
				.reduce((acc, cur, i) => ({
					idx: [...acc.idx, cur.i],
					q: {
						...acc.q,
						[`IdList.Id.${i + 1}`]: cur.jan
					}
				}),
					{
						idx: [] as number[],
						q: {
							'IdType': 'JAN',
							'Action': 'GetMatchingProductForId',
						}
					})
		}))
		.concatMap(({ q, idx, len }) =>
			Rx.Observable.if(
				() => idx.length > 0,

				AmazonAPI.fetch(q)
					.flatMap($ =>
						$('GetMatchingProductForIdResult')
							.toArray()
							.map(e =>
								$('Product', e)
									.toArray()
									.map((product, i) => ({
										i,
										ASIN: $('ASIN', product).first().text(),
										rank: parseInt($('Rank', product).first().text()) || 0
									}))
							)
					)
					.take(20)
					.share()
					.map(arr => Rx.Observable.from(arr))
					.concatMap(obs =>
						Rx.Observable.zip(

							obs
								.reduce((acc, { ASIN, i }) => ({
									[`ASINList.ASIN.${(i + 1)}`]: ASIN,
									...acc,
								}), null as { [key: string]: string })
								.filter(a => !!a)
								.map(asinParam => ({
									...asinParam,
									Action: 'GetLowestOfferListingsForASIN',
									ItemCondition: 'New'
								}))
								.concatMap(queries => AmazonAPI.fetch(queries))
								.doOnNext(
									$ => ($('Error').length > 0) ?
										console.log($('Error').html()) :
										null
								)
								.flatMap($ =>
									$('GetLowestOfferListingsForASINResult')
										.toArray()
										// .filter(el => !$('Error', el).length)
										.map(el => ({
											ASIN: $('ASIN', el).first().text(),
											price: Number($('LandedPrice', el).children('Amount').first().text())
										}))
								),
							obs.map(({ ASIN, rank }) => ({ ASIN, rank })),
							(LowestOfferListing, product) => ({
								...LowestOfferListing,
								...product
							} as AmazonAPI.AmazonData)
						)
							.filter(val => val.price > 0)
							.catch(err => {
								console.log(JSON.stringify(err))
								return Rx.Observable.empty()
							})
							.defaultIfEmpty({ ASIN: '', rank: 0, price: 0 } as AmazonAPI.AmazonData)
							.min((a, b) => a.price - b.price)
							.first()
							.map(val => ({
								'Amazon最低価格': val.price,
								'ランキング': val.rank,
								'ASIN': val.ASIN
							}))
					)
					.zip(
						Rx.Observable.from(idx),
						(data, i) =>
							({ data, i })
					)
			)
				.reduce((acc, cur) => {
					acc[cur.i] = cur.data
					return acc
				}, [...Array(len)].fill(
					{
						'Amazon最低価格': 0,
						'ランキング': 0,
						'ASIN': ''
					}))
		)
		.flatMap(arr => arr)


export const JANToASIN = (janCode: string) =>
	Rx.Observable.if(
		() => !!janCode,

		Rx.Observable.just({
			'Action': 'GetMatchingProductForId',
			'IdList.Id.1': janCode,
			'IdType': 'JAN'
		})
			.concatMap(queries => AmazonAPI.fetch(queries))
			.flatMap($ =>
				$('Product')
					.toArray()
					.map((product, i) => ({
						i,
						ASIN: $('ASIN', product).first().text(),
						rank: parseInt($('Rank', product).first().text()) || 0
					}))
			)
			.take(20)
			.share()
			.let(obs =>
				Rx.Observable.zip(

					obs
						.reduce((acc, { ASIN, i }) => ({
							[`ASINList.ASIN.${(i + 1)}`]: ASIN,
							...acc,
						}), null as { [key: string]: string })
						.filter(a => !!a)
						.map(asinParam => ({
							...asinParam,
							Action: 'GetLowestOfferListingsForASIN',
							ItemCondition: 'New'
						}))
						.concatMap(queries => AmazonAPI.fetch(queries))
						.doOnNext(
							$ => ($('Error').length > 0) ?
								console.log($('Error').html()) :
								null
						)
						.flatMap($ =>
							$('GetLowestOfferListingsForASINResult')
								.toArray()
								// .filter(el => !$('Error', el).length)
								.map(el => ({
									ASIN: $('ASIN', el).first().text(),
									price: Number($('LandedPrice', el).children('Amount').first().text())
								}))
						),
					obs.map(({ ASIN, rank }) => ({ ASIN, rank })),
					(LowestOfferListing, product) => ({
						...LowestOfferListing,
						...product
					} as AmazonAPI.AmazonData)
				)
			)
			.filter(val => val.price > 0)
			.catch(err => {
				console.log(JSON.stringify(err))
				return Rx.Observable.empty()
			})
	)
		.defaultIfEmpty({ ASIN: '', rank: 0, price: 0 } as AmazonAPI.AmazonData)
		.min((a, b) => a.price - b.price)
		.first()
		.map(val => ({
			'Amazon最低価格': val.price,
			'ランキング': val.rank,
			'ASIN': val.ASIN
		}))

export const getAmazonAndYahoo = (params: YahooAPI.YahooParams) =>
	getYahooItemList(params)
		.share()
		.bufferWithCount(5)
		.map(arr => Rx.Observable.from(arr))
		.concatMap(
			obs =>
				obs
					.zip(
						obs
							.map(yahoo => yahoo.JAN)
							.let(janObs => JANsToASINs(janObs)),
						(_yahoo, amazon) =>
							({
								..._yahoo,
								...amazon,
								'AmazonURL': 'https://www.amazon.co.jp/gp/product/' + amazon.ASIN,
								'モノレートURL': 'http://mnrate.com/item/aid/' + amazon.ASIN,
								'価格差': amazon.Amazon最低価格 - _yahoo.yahoo店舗価格,
								'粗利': (amazon.Amazon最低価格 > 0) ?
									((amazon.Amazon最低価格 - _yahoo.yahoo店舗価格) / amazon.Amazon最低価格 * 100).toFixed(2) + '%' :
									''
							})
					)
		)
		.map(obj =>
			titleKeys
				.map(key =>
					(obj[key] !== undefined) ? String(obj[key]) : ''))

		.doOnNext(console.log)


export const getFromSearchSheet = (spreadsheetId: string) =>
	apis.getData({
		range: '検索!A2:D',
		valueRenderOption: 'UNFORMATTED_VALUE'
	}, spreadsheetId)
		.let(YahooAPI.toYahooParam)
		.doOnNext(console.log)

export const setToItemSheet = (obs: Rx.Observable<string[]>, spreadsheetId: string) =>
	obs
		.bufferWithTimeOrCount(30 * 1000, 50)
		.concatMap((data, i) =>
			apis.appendData({
				range: `商品!A1:${String.fromCharCode(97 + titleKeys.length)}`,
				valueInputOption: 'USER_ENTERED',
				requestBody: {
					values: data
				}
			}, spreadsheetId)
		)
		.delay(5000)

export const getAndSave = () =>
	Rx.Observable.fromPromise(fs.readJSON(sheetListPath))
		.flatMap(arr => arr as string[])
		.concatMap(spreadsheetId =>
			apis.clearData({
				range: '商品!A1:' + String.fromCharCode(97 + titleKeys.length)
			}, spreadsheetId)
				.concatMap(res =>
					getFromSearchSheet(spreadsheetId)
				)
				.concatMap(params => getAmazonAndYahoo(params))
				.startWith(titleKeys)
				.let(obs => setToItemSheet(obs, spreadsheetId))
		)
