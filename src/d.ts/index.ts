
declare type SearchObject = {
	q?: string
	min?: number
	max?: number
	rowPerPage?: number
	type?: number,
	p?: number
	[key: string]: number | string
}


declare interface ErrorConstructor {
	extend(subTypeName: string, errorCode?: number): any
}
