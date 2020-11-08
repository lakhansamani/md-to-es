#!/usr/bin/env node

const yargs = require('yargs/yargs');
const { indexData } = require('../utils');

async function main() {
	const argv = yargs(process.argv.slice(2))
		.option('src', {
			alias: 's',
			describe: 'source directory containing markdown files',
		})
		.option('elasticsearch_url', {
			alias: 'e',
			describe: 'elasticsearch cluster url',
		})
		.option('elasticsearch_index', {
			alias: 'i',
			describe:
				'elasticsearch index name. By default it will use `markdown_data` as the index name',
		})
		.option('preview_length', {
			alias: 'p',
			describe:
				'preview content length. Defaults to first 70 chars of the content',
		})
		.demandOption(
			['src', 'elasticsearch_url'],
			'Please provide both src and elasticsearch_url arguments to work with this tool',
		)
		.help().argv;
	const src = argv.src;
	const elasticsearchURL = argv.elasticsearch_url;
	const previewLength = parseInt(argv.preview_length || '70', 0);
	const elasticsearchIndex = argv.elasticsearchIndex || 'markdown_data';
	console.log(`=> Source Directory`, src);
	const options = {
		src,
		elasticsearchURL,
		elasticsearchIndex,
		previewLength,
	};
	try {
		indexData(options);
	} catch (err) {
		throw err;
	}
}

main();
