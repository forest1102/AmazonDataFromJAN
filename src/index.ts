import { getAndSave, getFromSearchSheet } from './observable'
import * as moment from 'moment'
const start = moment()

getAndSave()
	.subscribe(
		val => console.log(val),
		console.error,
		() => console.log('Completed', start.fromNow())
	)

// getAmazonAndYahoo({
// 	store_id: 'cosmedenet',
// 	price_to: 2000
// })
// 	.subscribe(
// 		val => console.log(val),
// 		err => console.error(err),
// 		() => console.log('complete')
// 	)
