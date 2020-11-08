const path = require('path');
const moment = require('moment');
const truncate = require('lodash.truncate');
const chunk = require('lodash.chunk');
const fs = require('fs');
const yaml = require('yaml-front-matter');
const { Client } = require('@elastic/elasticsearch');

const { mappings } = require('./elasticsearch');

const getMDFiles = async (dir) => {
	try {
		const dirents = await fs.promises.readdir(dir, { withFileTypes: true });
		const files = await Promise.all(
			dirents.map((dirent) => {
				const res = path.resolve(dir, dirent.name);
				return dirent.isDirectory() ? getMDFiles(res) : res;
			}),
		);

		const filesList = Array.prototype.concat(...files);

		return filesList.filter((f) => {
			const ext = path.extname(f).toLowerCase();
			return ext === '.md' || ext === '.mdx';
		});
	} catch (err) {
		throw err;
	}
};

// Side effects:
// - Root node of JSON is files key mapping to a dictionary of files
// - .preview will be first WIDTH characters of the raw content
//   (not translated), if width is not 0
// - .__content is removed (potentially too large)
// - if .date is detected, a formated date is added as .dateFormatted

const processFile = (filename, width, content) => {
	const _basename = path.relative(process.cwd(), filename);

	const contents = fs.readFileSync(filename, { encoding: 'utf-8' });
	const _metadata = yaml.loadFront(contents);

	// If width is truthy (is defined and and is not 0).
	if (width) {
		// Max of WIDTH chars snapped to word boundaries, trim whitespace
		const truncateOptions = {
			length: width,
			separator: /\s/,
			omission: ' …',
		};
		_metadata.preview = truncate(
			_metadata['__content'].trim(),
			truncateOptions,
		);
	}

	// If the option is provided keep the entire content in field 'content'
	if (typeof content != 'undefined') {
		_metadata['content'] = _metadata['__content'];
	}

	delete _metadata['__content'];

	// map user-entered date to a better one using moment's great parser
	if (_metadata.date) {
		_metadata.iso8601Date = moment(_metadata.date).format();
	}

	_metadata.basename = _basename;

	return {
		metadata: _metadata,
		basename: _basename,
	};
};

const getFiles = (filename) => {
	if (fs.lstatSync(filename).isDirectory()) {
		return fs.readdirSync(filename).filter((entry) => !entry.isDirectory);
	} else {
		return [filename];
	}
};

const parse = (filenames, options) => {
	// http://i.qkme.me/3tmyv8.jpg
	const parseAllTheFiles = {};
	// http://i.imgur.com/EnXB9aA.jpg

	const files = filenames
		.map(getFiles)
		.reduce((collection, filenames) => collection.concat(filenames), []);

	files
		.map((file) => processFile(file, options.width, options.content))
		.forEach((data) => {
			parseAllTheFiles[data.basename] = data.metadata;
		});

	const json = JSON.stringify(parseAllTheFiles, null, options.minify ? 0 : 2);

	if (options.outfile) {
		const file = fs.openSync(options.outfile, 'w+');
		fs.writeSync(file, json + '\n');
		fs.closeSync(file);
		return;
	} else {
		return JSON.parse(json);
	}
};

const indexData = async ({
	src,
	elasticsearchURL,
	elasticsearchIndex,
	previewLength,
}) => {
	try {
		const files = await getMDFiles(src);
		console.log(`=> Source files to process:`);
		console.log(files);
		const client = new Client({
			node: elasticsearchURL,
			maxRetries: 5,
			requestTimeout: 60000,
		});

		// connect with elasticsearch and make sure its valid cluster url
		await client.ping();
		console.log(`=> Successfully connected to Elasticsearch`);

		const { body: indexCheckRes } = await client.indices.exists({
			index: elasticsearchIndex,
		});
		console.log(JSON.stringify(mappings));
		if (!indexCheckRes) {
			// create index
			await client.indices.create({
				index: elasticsearchIndex,
				body: mappings,
			});

			console.log(`=> ${elasticsearchIndex} index created successfully.`);
		} else {
			console.log(`=> ${elasticsearchIndex} already exists.`);
		}
		const options = {
			minify: false,
			width: previewLength,
			outfile: null,
			content: true,
		};

		// process data in chunks of 25 documents
		const fileChunks = chunk(files, 25);
		for (const fileChunk of fileChunks) {
			// parsed data
			const dataObj = parse(fileChunk, options);
			const dataset = Object.keys(dataObj).reduce((agg, fileName) => {
				return [
					...agg,
					{
						_id: fileName,
						...dataObj[fileName],
					},
				];
			}, []);
			// const bulk data

			const body = dataset.flatMap(({ _id, ...doc }) => [
				{ index: { _index: elasticsearchIndex, _id } },
				doc,
			]);

			const { body: bulkResponse } = await client.bulk({
				refresh: true,
				body,
			});

			if (bulkResponse.errors) {
				const erroredDocuments = [];
				// The items array has the same order of the dataset we just indexed.
				// The presence of the `error` key indicates that the operation
				// that we did for the document has failed.
				bulkResponse.items.forEach((action, i) => {
					const operation = Object.keys(action)[0];
					if (action[operation].error) {
						erroredDocuments.push({
							// If the status is 429 it means that you can retry the document,
							// otherwise it's very likely a mapping error, and you should
							// fix the document before to try it again.
							status: action[operation].status,
							error: action[operation].error,
							operation: body[i * 2],
							document: body[i * 2 + 1],
						});
					}
				});
				console.log(erroredDocuments);
			}
		}

		console.log(`=> Indexing data completed.`);
	} catch (err) {
		throw err;
	}
};

module.exports = {
	indexData,
};
