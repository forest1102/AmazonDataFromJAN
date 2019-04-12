import { Observable } from 'rx'
const RETRY_DEFAULT = 2
const SEC_DEFAULT = 30 * 1000
export const withDelay = (errs: Observable<{}>, MAX = RETRY_DEFAULT, sec = SEC_DEFAULT) =>
	errs
		.doOnNext(err => console.error('' + err))
		.zip(
			Observable.range(1, MAX + 1),
			(n, i) => ({ n, i }))
		.doOnNext(() => console.log('リトライします。'))
		.concatMap(({ n, i }) =>
			Observable.if(
				() => i > MAX,
				Observable.throw(n as Error),
				Observable.timer(sec)
			))
